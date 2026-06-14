const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockReceipt = require('../models/StockReceipt');
const SupplierReturn = require('../models/SupplierReturn');
const Store = require('../models/Store');
const SupplierPayment = require('../models/SupplierPayment');
const InventoryTransfer = require('../models/InventoryTransfer');

const resolveStoreId = async (req, { bodyKey = 'storeId', queryKey = 'storeId' } = {}) => {
  const user = req.user;
  // Manager — find the store they manage
  if (user.role === 'manager') {
    const store = await Store.findOne({ managerId: user._id }).select('_id').lean();
    return store?._id || null;
  }
  // Cashier / stockEmployee — use their assignedStore
  if (user.role === 'cashier' || user.role === 'stockEmployee') {
    return user.assignedStore || null;
  }
  // Admin — use body/query storeId
  return req.body?.[bodyKey] || req.query?.[queryKey] || null;
};

const applyReceivingToProduct = async ({ productId, qty, unitCost, storeId }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');
  if (String(product.storeId) !== String(storeId)) throw new Error('Product does not belong to this store');

  const oldStock = Number(product.stock || 0);
  const addQty = Number(qty || 0);
  const cost = Number(unitCost || 0);

  // --- Price Row Logic ---
  if (!product.priceRows) product.priceRows = [];

  // Find existing row with the same cost price (tolerance 0.01)
  const existingRow = product.priceRows.find(
    (r) => Math.abs(Number(r.costPrice) - cost) < 0.01
  );

  if (existingRow) {
    // Same price → add qty to existing row
    existingRow.qty = Number(existingRow.qty || 0) + addQty;
    existingRow.receivedAt = new Date();
  } else {
    // Different price → create new row
    product.priceRows.push({ costPrice: cost, qty: addQty, receivedAt: new Date() });
  }

  // Update overall stock & averages
  const oldAvg = Number(product.avgCost || 0);
  const newStock = oldStock + addQty;
  const newAvg = newStock > 0 ? ((oldAvg * oldStock) + (cost * addQty)) / newStock : 0;

  product.stock = newStock;
  product.lastCost = cost;
  product.avgCost = Number.isFinite(newAvg) ? Number(newAvg.toFixed(4)) : product.avgCost;
  product.markModified('priceRows');
  await product.save();

  return product;
};

const applySupplierReturnToProduct = async ({ productId, qty, unitCostAtReturn, storeId }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');
  if (String(product.storeId) !== String(storeId)) throw new Error('Product does not belong to this store');

  const currentStock = Number(product.stock || 0);
  const returnQty = Number(qty || 0);
  if (returnQty > currentStock) throw new Error(`Insufficient stock for ${product.name}`);

  product.stock = currentStock - returnQty;
  if (unitCostAtReturn !== undefined && unitCostAtReturn !== null && unitCostAtReturn !== '') {
    const cost = Number(unitCostAtReturn || 0);
    product.lastCost = cost;
  }
  await product.save();
  return product;
};

// @desc    Create stock receipt (GRN)
// @route   POST /api/stock/receipts
// @access  Private/Admin/Manager
const createStockReceipt = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    console.log('[GRN] role:', req.user?.role, '| body.storeId:', req.body?.storeId, '| resolved storeId:', storeId);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }

    const { supplierId, receivedAt, invoiceNo, items, notes, grnNumber } = req.body;
    console.log('[GRN] supplierId:', supplierId, '| items count:', items?.length);
    if (!supplierId) {
      res.status(400);
      return next(new Error('supplierId is required'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('At least one item is required'));
    }

    const supplier = await Supplier.findById(supplierId).select('_id storeId status').lean();
    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }
    if (supplier.status !== 'active') {
      res.status(400);
      return next(new Error('Supplier is inactive'));
    }

    for (const it of items) {
      if (!it?.productId || !it?.qty || it.qty <= 0) {
        res.status(400);
        return next(new Error('Invalid receipt item'));
      }
      if (it.unitCost === undefined || it.unitCost === null || Number(it.unitCost) < 0) {
        res.status(400);
        return next(new Error('unitCost is required for each item'));
      }
    }

    // Always use the supplier's own storeId — this is the single source of truth
    const targetStoreId = supplier.storeId;

    const receiptData = {
      storeId: targetStoreId,
      supplierId,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      invoiceNo: invoiceNo || '',
      items: items.map((i) => ({ productId: i.productId, qty: Number(i.qty), unitCost: Number(i.unitCost) })),
      notes: notes || '',
      createdBy: req.user._id,
    };

    // Allow manual GRN number if provided
    if (grnNumber) {
      receiptData.grnNumber = grnNumber;
    }

    const receipt = await StockReceipt.create(receiptData);

    for (const it of receipt.items) {
      await applyReceivingToProduct({
        productId: it.productId,
        qty: it.qty,
        unitCost: it.unitCost,
        storeId: targetStoreId,
      });
    }

    // Auto-record purchase in supplier payments ledger
    const totalCost = receipt.items.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const c = Number(it.unitCost) || 0;
      return sum + (q * c);
    }, 0);

    if (totalCost > 0) {
      console.log('[GRN] Creating SupplierPayment | supplierId:', receipt.supplierId, '| storeId:', targetStoreId, '| amount:', totalCost);
      try {
        const sp = await SupplierPayment.create({
          supplierId: receipt.supplierId,
          storeId: targetStoreId,
          type: 'purchase',
          amount: totalCost,
          description: `GRN ${receipt.grnNumber || receipt._id} — ${receipt.items.length} item(s)`,
          date: receipt.receivedAt || new Date(),
          referenceId: receipt._id,
          createdBy: req.user._id,
        });
        console.log('[GRN] SupplierPayment created OK:', sp._id, '| amount:', sp.amount);
      } catch (spErr) {
        console.error('[GRN ERROR] Failed to create SupplierPayment:', spErr.message, '| stack:', spErr.stack);
      }
    } else {
      console.log('[GRN] Skipping SupplierPayment (totalCost is 0)');
    }

    const populated = await StockReceipt.findById(receipt._id)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (error) { next(error); }
};

// @desc    List stock receipts
// @route   GET /api/stock/receipts
// @access  Private/Admin/Manager
const listStockReceipts = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }
    const { startDate, endDate, supplierId, grnNumber } = req.query;
    const filter = { storeId };
    if (supplierId) filter.supplierId = supplierId;
    if (grnNumber) {
      filter.grnNumber = { $regex: grnNumber, $options: 'i' };
    }
    if (startDate || endDate) {
      filter.receivedAt = {};
      if (startDate) filter.receivedAt.$gte = new Date(startDate);
      if (endDate) filter.receivedAt.$lte = new Date(endDate);
    }

    const receipts = await StockReceipt.find(filter)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name')
      .sort({ receivedAt: -1 })
      .limit(200);

    res.json(receipts);
  } catch (error) { next(error); }
};

// @desc    Get single stock receipt by GRN number
// @route   GET /api/stock/receipts/grn/:grnNumber
// @access  Private/Admin/Manager
const getReceiptByGRN = async (req, res, next) => {
  try {
    const { grnNumber } = req.params;
    const receipt = await StockReceipt.findOne({ grnNumber: { $regex: `^${grnNumber}$`, $options: 'i' } })
      .populate('supplierId', 'name phone email')
      .populate('items.productId', 'name sku price')
      .populate('createdBy', 'name');

    if (!receipt) {
      res.status(404);
      return next(new Error('GRN not found'));
    }
    res.json(receipt);
  } catch (error) { next(error); }
};

// @desc    Create supplier return
// @route   POST /api/stock/supplier-returns
// @access  Private/Admin/Manager
const createSupplierReturn = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }
    const { supplierId, returnedAt, reason, items, notes } = req.body;
    if (!supplierId) {
      res.status(400);
      return next(new Error('supplierId is required'));
    }
    if (!reason) {
      res.status(400);
      return next(new Error('reason is required'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('At least one item is required'));
    }

    const supplier = await Supplier.findById(supplierId).select('_id storeId status').lean();
    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }
    if (String(supplier.storeId) !== String(storeId)) {
      res.status(403);
      return next(new Error('Supplier does not belong to this store'));
    }

    for (const it of items) {
      if (!it?.productId || !it?.qty || it.qty <= 0) {
        res.status(400);
        return next(new Error('Invalid return item'));
      }
    }

    const targetStoreId = supplier.storeId || storeId;

    const ret = await SupplierReturn.create({
      storeId: targetStoreId,
      supplierId,
      returnedAt: returnedAt ? new Date(returnedAt) : new Date(),
      reason,
      items: items.map((i) => ({
        productId: i.productId,
        qty: Number(i.qty),
        unitCostAtReturn: i.unitCostAtReturn === undefined ? undefined : Number(i.unitCostAtReturn),
      })),
      notes: notes || '',
      createdBy: req.user._id,
    });

    // Deduct stock
    for (const it of ret.items) {
      await applySupplierReturnToProduct({
        productId: it.productId,
        qty: it.qty,
        unitCostAtReturn: it.unitCostAtReturn,
        storeId: targetStoreId,
      });
    }

    // Auto-record return as a "payment" (credit) in supplier ledger
    const totalReturnCost = ret.items.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const c = Number(it.unitCostAtReturn) || 0;
      return sum + (q * c);
    }, 0);

    if (totalReturnCost > 0) {
      try {
        await SupplierPayment.create({
          supplierId: ret.supplierId,
          storeId: targetStoreId,
          type: 'payment',
          amount: totalReturnCost,
          description: `Stock Return: ${ret.reason} (${ret.items.length} item(s))`,
          date: ret.returnedAt || new Date(),
          referenceId: ret._id,
          createdBy: req.user._id,
        });
      } catch (spErr) {
        console.error('Failed to auto-record supplier return:', spErr.message);
      }
    }

    const populated = await SupplierReturn.findById(ret._id)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (error) { next(error); }
};

// @desc    List supplier returns
// @route   GET /api/stock/supplier-returns
// @access  Private/Admin/Manager
const listSupplierReturns = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }
    const { startDate, endDate, supplierId, reason } = req.query;
    const filter = { storeId };
    if (supplierId) filter.supplierId = supplierId;
    if (reason) filter.reason = reason;
    if (startDate || endDate) {
      filter.returnedAt = {};
      if (startDate) filter.returnedAt.$gte = new Date(startDate);
      if (endDate) filter.returnedAt.$lte = new Date(endDate);
    }

    const returns = await SupplierReturn.find(filter)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name')
      .sort({ returnedAt: -1 })
      .limit(200);

    res.json(returns);
  } catch (error) { next(error); }
};

// @desc    Create inventory transfer request
// @route   POST /api/stock/transfers
// @access  Private/Admin/Manager
const createInventoryTransfer = async (req, res, next) => {
  try {
    const { fromStoreId, toStoreId, items } = req.body;
    if (!fromStoreId || !toStoreId || !items || items.length === 0) {
      res.status(400);
      return next(new Error('fromStoreId, toStoreId, and items are required'));
    }

    if (String(fromStoreId) === String(toStoreId)) {
      res.status(400);
      return next(new Error('Cannot transfer to the same store/branch'));
    }

    // Verify origin stock
    for (const it of items) {
      const product = await Product.findById(it.productId);
      if (!product) {
        res.status(404);
        return next(new Error(`Product not found: ${it.productId}`));
      }
      if (product.stock < it.qty) {
        res.status(400);
        return next(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`));
      }
    }

    const transferNo = `TRSF-${Date.now()}`;
    const transfer = await InventoryTransfer.create({
      transferNo,
      fromStoreId,
      toStoreId,
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        sku: i.sku,
        barcode: i.barcode,
        qty: Number(i.qty)
      })),
      status: 'pending',
      createdBy: req.user._id,
    });

    res.status(201).json(transfer);
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory transfers
// @route   GET /api/stock/transfers
// @access  Private/Admin/Manager
const getInventoryTransfers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) {
        filter.$or = [
          { fromStoreId: store._id },
          { toStoreId: store._id }
        ];
      }
    } else {
      const { storeId } = req.query;
      if (storeId) {
        filter.$or = [
          { fromStoreId: storeId },
          { toStoreId: storeId }
        ];
      }
    }

    const transfers = await InventoryTransfer.find(filter)
      .populate('fromStoreId', 'name')
      .populate('toStoreId', 'name')
      .populate('createdBy', 'name')
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete / Receive inventory transfer
// @route   PUT /api/stock/transfers/:id/complete
// @access  Private/Admin/Manager
const completeInventoryTransfer = async (req, res, next) => {
  try {
    const transfer = await InventoryTransfer.findById(req.params.id);
    if (!transfer) {
      res.status(404);
      return next(new Error('Transfer not found'));
    }

    if (transfer.status !== 'pending') {
      res.status(400);
      return next(new Error(`Transfer is already ${transfer.status}`));
    }

    // Process each item
    for (const item of transfer.items) {
      const originProduct = await Product.findById(item.productId);
      if (!originProduct) {
        res.status(404);
        return next(new Error(`Origin product not found: ${item.name}`));
      }

      if (originProduct.stock < item.qty) {
        res.status(400);
        return next(new Error(`Insufficient stock in origin store for product ${item.name}`));
      }

      // 1. Deduct stock from origin
      originProduct.stock -= item.qty;
      await originProduct.save();

      // 2. Add stock to destination
      // Search for product with same barcode/SKU/name in destination store
      const destQuery = { storeId: transfer.toStoreId };
      if (item.barcode) destQuery.barcode = item.barcode;
      else if (item.sku) destQuery.sku = item.sku;
      else destQuery.name = item.name;

      let destProduct = await Product.findOne(destQuery);
      if (destProduct) {
        // Increment stock
        destProduct.stock += item.qty;
        if (!destProduct.priceRows) destProduct.priceRows = [];
        destProduct.priceRows.push({
          costPrice: originProduct.costPrice || originProduct.lastCost || 0,
          qty: item.qty,
          receivedAt: new Date()
        });
        destProduct.markModified('priceRows');
        await destProduct.save();
      } else {
        // Clone from origin to destination
        const clonedObj = originProduct.toObject();
        delete clonedObj._id;
        delete clonedObj.createdAt;
        delete clonedObj.updatedAt;
        
        clonedObj.storeId = transfer.toStoreId;
        clonedObj.stock = item.qty;
        clonedObj.slug = originProduct.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        clonedObj.priceRows = [{
          costPrice: originProduct.costPrice || originProduct.lastCost || 0,
          qty: item.qty,
          receivedAt: new Date()
        }];

        await Product.create(clonedObj);
      }
    }

    transfer.status = 'completed';
    transfer.receivedBy = req.user._id;
    await transfer.save();

    res.json(transfer);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel inventory transfer
// @route   PUT /api/stock/transfers/:id/cancel
// @access  Private/Admin/Manager
const cancelInventoryTransfer = async (req, res, next) => {
  try {
    const transfer = await InventoryTransfer.findById(req.params.id);
    if (!transfer) {
      res.status(404);
      return next(new Error('Transfer not found'));
    }

    if (transfer.status !== 'pending') {
      res.status(400);
      return next(new Error(`Transfer is already ${transfer.status}`));
    }

    transfer.status = 'cancelled';
    await transfer.save();
    res.json(transfer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStockReceipt,
  listStockReceipts,
  getReceiptByGRN,
  createSupplierReturn,
  listSupplierReturns,
  createInventoryTransfer,
  getInventoryTransfers,
  completeInventoryTransfer,
  cancelInventoryTransfer,
};
