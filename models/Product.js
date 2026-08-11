const mongoose = require("mongoose");


const productSchema = new mongoose.Schema({
  name: {    type: String,    required: true,    trim: true  }, 
 vendor: {    type: mongoose.Schema.Types.ObjectId,    ref: "Vendor",    required: true  },  price: {    type: Number,    required: true, min: 1  },
  category: {    type: String,    required: true  }, 
 description: {    type: String,    trim: true  }, 
 image: {    type: String,    required: true  },
 createdAt: {    type: Date,    default: Date.now  }, 
 updatedAt: {    type: Date,    default: Date.now  }});

module.exports = mongoose.model("Product", productSchema);
