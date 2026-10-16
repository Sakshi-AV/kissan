const mongoose = require('mongoose');

const farmerVerificationSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    farmName: {
      type: String,
      required: true,
    },
    farmAddress: {
      type: String,
      required: true,
    },
    idProofType: {
      type: String,
      required: true,
      enum: ['aadhaar', 'kisan_credit_card', 'land_records', 'voter_id', 'other'],
      default: 'land_records',
    },
    idProofNumberMasked: {
      type: String,
      required: true,
    },
    documentUrl: {
      type: String,
      default: '',
    },
    farmSizeAcres: {
      type: Number,
      default: 1,
    },
    organicCertified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FarmerVerification', farmerVerificationSchema);
