import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, MapPin, Clock, CreditCard, Download, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getOrderById, cancelMyOrder } from '../services/api';
import useCurrencyStore from '../store/currencyStore';
import { toast } from 'react-toastify';

const OrderConfirmation = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { convertPrice, formatPrice } = useCurrencyStore();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await getOrderById(id);
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="base-container py-20 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-green border-t-transparent rounded-full mx-auto"></div>
        <p className="text-muted-text mt-4">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="base-container py-20 text-center">
        <h2 className="text-2xl font-bold text-dark-navy mb-2 mt-0">Order not found</h2>
        <Link to="/" className="text-primary-green hover:underline">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="base-container py-12 max-w-2xl mx-auto">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full mx-auto mb-4 flex items-center justify-center">
          <CheckCircle size={40} className="text-primary-green" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-dark-navy mt-0 mb-2">Order Confirmed!</h1>
        <p className="text-muted-text m-0">Thank you for your order. We'll start preparing it right away.</p>
      </motion.div>

      <motion.div
        className="bg-white border border-card-border rounded-2xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-card-border">
          <div>
            <p className="text-xs text-muted-text m-0">Order ID</p>
            <p className="font-bold text-dark-navy m-0 text-sm font-mono">#{order._id.slice(-8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-text m-0">Date</p>
            <p className="font-medium text-dark-navy m-0 text-sm">
              {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            order.orderStatus === 'confirmed' ? 'bg-blue-100 text-blue-700' :
            order.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            Order: {order.orderStatus}
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            order.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            Payment: {order.paymentStatus}
          </span>
        </div>

        {/* Items */}
        <h4 className="font-bold text-dark-navy mt-0 mb-3 flex items-center gap-2">
          <Package size={16} className="text-primary-green" /> Items
        </h4>
        <div className="space-y-3 mb-6">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <img src={item.image || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-sm font-medium text-dark-navy m-0">{item.name}</p>
                <p className="text-xs text-muted-text m-0">Qty: {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold">{formatPrice(convertPrice(item.price * item.quantity))}</span>
            </div>
          ))}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {order.deliveryAddress && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-muted-text m-0 mb-1 flex items-center gap-1"><MapPin size={12} /> Delivery Address</p>
              <p className="text-sm font-medium text-dark-navy m-0">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
              </p>
            </div>
          )}
          {order.deliverySlot && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-muted-text m-0 mb-1 flex items-center gap-1"><Clock size={12} /> Delivery Slot</p>
              <p className="text-sm font-medium text-dark-navy m-0">
                {new Date(order.deliverySlot.date).toLocaleDateString()} — {order.deliverySlot.timeSlot}
              </p>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t border-card-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-text">Payment Method</span>
            <span className="font-medium capitalize flex items-center gap-1"><CreditCard size={14} /> {order.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-text">Delivery Fee</span>
            <span className="font-medium">{formatPrice(convertPrice(order.deliveryFee || 0))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-text">Tax</span>
            <span className="font-medium">{formatPrice(convertPrice(order.tax || 0))}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-card-border">
            <span className="font-bold text-dark-navy text-lg">Total</span>
            <span className="font-bold text-dark-navy text-lg">{formatPrice(convertPrice(order.totalAmount))}</span>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-4 justify-center">
        {order.orderStatus !== 'cancelled' && !['shipped', 'out_for_delivery', 'delivered', 'completed'].includes(order.orderStatus) && (() => {
          const hours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
          return hours <= 1;
        })() && (
          <button onClick={async () => {
            if (!window.confirm('Cancel this order?')) return;
            try {
              await cancelMyOrder(order._id, { reason: 'Cancelled by customer' });
              toast.success('Order cancelled');
              const { data } = await getOrderById(id);
              setOrder(data);
            } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
          }} className="bg-red-500 text-white font-semibold py-3 px-8 rounded-full hover:bg-red-600 transition-all shadow-lg flex items-center gap-2">
            <XCircle size={18} /> Cancel Order
          </button>
        )}
        <button onClick={() => {
          const lines = [
            '═══════════════════════════════════════',
            '           SMARTLOVER',
            '            PURCHASE RECEIPT',
            '═══════════════════════════════════════',
            '', `Order: #${order._id.slice(-8).toUpperCase()}`,
            `Date: ${new Date(order.createdAt).toLocaleString()}`,
            `Status: ${order.orderStatus}`, `Payment: ${order.paymentMethod}`, '',
            '───────────────────────────────────────', 'ITEMS:', '───────────────────────────────────────',
          ];
          order.items.forEach((it, i) => {
            lines.push(`${i + 1}. ${it.name} (x${it.quantity}) = Rs. ${(it.price * it.quantity).toLocaleString()}`);
          });
          lines.push('───────────────────────────────────────');
          if (order.deliveryFee) lines.push(`Delivery: Rs. ${order.deliveryFee}`);
          if (order.tax) lines.push(`Tax: Rs. ${order.tax}`);
          lines.push(`TOTAL: Rs. ${order.totalAmount?.toLocaleString()}`);
          lines.push('', '═══════════════════════════════════════', '   Thank you for shopping with us!', '═══════════════════════════════════════');
          const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url;
          a.download = `Smartlover_Bill_${order._id.slice(-8).toUpperCase()}.txt`;
          a.click(); URL.revokeObjectURL(url);
        }} className="bg-blue-500 text-white font-semibold py-3 px-8 rounded-full hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2">
          <Download size={18} /> Download Bill
        </button>
        <Link to="/orders" className="bg-primary-green text-white font-semibold py-3 px-8 rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200">
          View All Orders
        </Link>
        <Link to="/shop" className="border-2 border-card-border text-dark-navy font-semibold py-3 px-8 rounded-full hover:border-primary-green hover:text-primary-green transition-all">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;
