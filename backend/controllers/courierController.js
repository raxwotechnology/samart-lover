const Courier = require('../models/Courier');
const mongoose = require('mongoose');

// @desc    Get all courier services
// @route   GET /api/couriers
// @access  Public
const getCouriers = async (req, res, next) => {
  try {
    // Return active couriers by default, unless query parameter ?all=true is passed
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const couriers = await Courier.find(filter).sort({ name: 1 });
    res.json(couriers);
  } catch (error) {
    next(error);
  }
};

// @desc    Get courier by id (including payments)
// @route   GET /api/couriers/:id
// @access  Public
const getCourierById = async (req, res, next) => {
  try {
    const courier = await Courier.findById(req.params.id);
    if (!courier) {
      res.status(404);
      return next(new Error('Courier not found'));
    }
    res.json(courier);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a courier service
// @route   POST /api/couriers
// @access  Private/Admin/Manager
const createCourier = async (req, res, next) => {
  try {
    const { name, isActive, address, phone, balance, charge } = req.body;
    
    const existing = await Courier.findOne({ name });
    if (existing) {
      res.status(400);
      return next(new Error('Courier service with this name already exists'));
    }

    const courier = await Courier.create({
      name,
      address: address || '',
      phone: phone || '',
      balance: Number(balance) || 0,
      charge: Number(charge) || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(courier);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a courier service
// @route   PUT /api/couriers/:id
// @access  Private/Admin/Manager
const updateCourier = async (req, res, next) => {
  try {
    const courier = await Courier.findById(req.params.id);
    if (!courier) {
      res.status(404);
      return next(new Error('Courier service not found'));
    }

    const { name, isActive, address, phone, balance, charge } = req.body;

    if (name) {
      const existing = await Courier.findOne({ name, _id: { $ne: req.params.id } });
      if (existing) {
        res.status(400);
        return next(new Error('Courier service with this name already exists'));
      }
      courier.name = name;
    }

    if (address !== undefined) courier.address = address || '';
    if (phone !== undefined) courier.phone = phone || '';
    if (balance !== undefined) courier.balance = Number(balance) || 0;
    if (charge !== undefined) courier.charge = Number(charge) || 0;
    if (isActive !== undefined) courier.isActive = !!isActive;

    const updated = await courier.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a courier service
// @route   DELETE /api/couriers/:id
// @access  Private/Admin/Manager
const deleteCourier = async (req, res, next) => {
  try {
    const courier = await Courier.findById(req.params.id);
    if (!courier) {
      res.status(404);
      return next(new Error('Courier service not found'));
    }

    await courier.deleteOne();
    res.json({ message: 'Courier service deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payments for courier
// @route   GET /api/couriers/:id/payments
// @access  Private/Admin/Manager
const getCourierPayments = async (req, res, next) => {
  try {
    const courier = await Courier.findById(req.params.id).select('payments balance');
    if (!courier) { res.status(404); return next(new Error('Courier not found')); }
    res.json({ payments: courier.payments || [], balance: courier.balance || 0 });
  } catch (error) { next(error); }
};

// @desc    Record a payment to courier (reduce balance)
// @route   POST /api/couriers/:id/payments
// @access  Private/Admin/Manager
const addCourierPayment = async (req, res, next) => {
  try {
    const courier = await Courier.findById(req.params.id);
    if (!courier) { res.status(404); return next(new Error('Courier not found')); }
    const { amount, note, date } = req.body;
    const num = Number(amount || 0);
    if (!num || num <= 0) { res.status(400); return next(new Error('Invalid payment amount')); }
    courier.payments = courier.payments || [];
    courier.payments.push({ amount: num, date: date ? new Date(date) : new Date(), note: note || '' });
    courier.balance = (Number(courier.balance || 0) - num);
    await courier.save();
    res.json({ payments: courier.payments, balance: courier.balance });
  } catch (error) { next(error); }
};

module.exports = {
  getCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  deleteCourier,
  getCourierPayments,
  addCourierPayment,
};
