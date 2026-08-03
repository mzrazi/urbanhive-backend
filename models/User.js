const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },  // Added phone number
  address: { type: String, required: true }, // Added address
  passwordResetToken: String,
  passwordResetExpires: Date,
  cart: [{ 
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
    quantity: { type: Number, default: 1 } 
  }]
  
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
