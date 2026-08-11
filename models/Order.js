const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ["Pending", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Pending",
    },
    
    paymentStatus: {
      type: String,
      enum: ["Pending", "Successful", "Failed"], 
      default: "Pending",
    },
    razorpayOrderId: { type: String, required: true, unique: true }, // Store Razorpay order ID directly
    paymentDetails: {
      razorpayPaymentId: String,
      razorpaySignature: String,
    },
    deliveryDate: { type: Date },
    history: [
      {
        status: { type: String, enum: ["Pending", "out for delivery", "Delivered", "Cancelled"], required: true },
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    rating: { type: Number, min: 0, max: 5 ,default:0}
  },
  { timestamps: true } 
)

module.exports = mongoose.model("Order", orderSchema);
