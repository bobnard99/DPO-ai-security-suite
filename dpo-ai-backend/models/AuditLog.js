import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentType: {
        type: String,
        required: true,
        enum: ['Privacy Policy', 'Terms of Service', 'Employment Contract', 'Vendor Agreement', 'Other'],
        default: 'Other'
    },
    characterCount: {
        type: Number,
        required: true,
        min: 0
    },
    complianceScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    status: {
        type: String,
        enum: ['Completed', 'Failed'],
        default: 'Completed'
    }
}, { timestamps: true, strict: 'throw' });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
