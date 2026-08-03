const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  passwordResetToken: String,
  passwordResetExpires: Date,
  phone: { type: String, required: true },
  storeName: { type: String, required: true },
  storeAddress: { type: String, required: true },
  category:{ type: String, required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  
  
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' }, 
    coordinates: {
      type: [Number], 
      required: true,
    },
  },
  averageRating: {
    type: Number,
    default: 0,  
  },
  
  
  approvedByAdmin: { type: Boolean, default: false }, 
  
  createdAt: { type: Date, default: Date.now },
});

// Add geospatial index on the location field to enable geospatial queries
vendorSchema.index({ location: '2dsphere' });

module.exports = mongoose.model("Vendor", vendorSchema);
