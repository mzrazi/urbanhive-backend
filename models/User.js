const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, required: true, trim: true },  // Added phone number
  address: { type: String, required: true, trim: true }, // Added address
  isBlocked: { type: Boolean, default: false },
  passwordResetToken: String,
  passwordResetExpires: Date,
  cart: [{ 
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
    quantity: { type: Number, default: 1 } 
  }]
  
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
