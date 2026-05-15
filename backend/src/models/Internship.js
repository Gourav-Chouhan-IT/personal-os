// Internship model — CRM for tracking internship applications through the pipeline
import mongoose from 'mongoose';

const internshipSchema = new mongoose.Schema({
  company:         { type: String, required: true, trim: true },
  role:            { type: String, default: '', trim: true },
  jdLink:          { type: String, default: '' },
  jdText:          { type: String, default: '' },
  dateApplied:     { type: Date },
  status:          { type: String, enum: ['Identified', 'Applied', 'Screening', 'Technical', 'Final', 'Offer', 'Rejected'], default: 'Identified' },
  followUpDate:    { type: Date },
  contactPerson:   { type: String, default: '' },
  contactLinkedIn: { type: String, default: '' },
  coldEmailSent:   { type: Boolean, default: false },
  coldEmailText:   { type: String, default: '' },
  notes:           { type: String, default: '' },
  rating:          { type: String, enum: ['Dream', 'Good', 'Okay', 'Backup', ''], default: '' },
}, { timestamps: true });

export default mongoose.model('Internship', internshipSchema);
