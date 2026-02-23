import Document from '../models/Document.js';
import Employee from '../models/Employee.js';
import cloudinary from '../config/cloudinary.js';
import { createAuditLog } from '../utils/auditHelper.js';
import { createNotification } from '../utils/notificationHelper.js';

// @desc    Upload document for employee
// @route   POST /api/documents/:employeeId
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Only the account owner or HR can upload documents
    const isOwner = employee.user.toString() === req.user._id.toString();
    const isHR = req.user.role === 'hr';
    if (!isOwner && !isHR) {
      return res.status(403).json({ message: 'Only the account owner or HR can upload documents' });
    }

    // Determine resource type based on mimetype
    const isImage = req.file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    // Extract file extension from original filename
    const origExt = req.file.originalname.includes('.')
      ? '.' + req.file.originalname.split('.').pop().toLowerCase()
      : '';

    // Upload to Cloudinary manually with correct resource_type
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'hrms/documents',
          resource_type: resourceType,
          public_id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${origExt}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const doc = await Document.create({
      employee: employee._id,
      name: req.body.name || req.file.originalname,
      type: req.body.type || 'Other',
      description: req.body.description || '',
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      expiryDate: req.body.expiryDate,
      uploadedBy: req.user._id
    });

    await createAuditLog({
      userId: req.user._id,
      action: 'UPLOAD',
      module: 'Document',
      description: `Document "${doc.name}" uploaded for ${employee.firstName} ${employee.lastName}`,
      targetId: doc._id,
      targetModel: 'Document',
      ipAddress: req.ip
    });

    // Notify the employee about the document upload
    if (employee.user) {
      await createNotification({
        recipientId: employee.user,
        type: 'document_uploaded',
        title: 'Document Uploaded',
        message: `A new document "${doc.name}" has been uploaded to your profile`,
        link: `/employees/${employee._id}`
      });
    }

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get documents for employee
// @route   GET /api/documents/:employeeId
export const getDocuments = async (req, res) => {
  try {
    // Employee can only see their own documents
    if (req.user.role === 'employee') {
      const emp = await Employee.findOne({ user: req.user._id });
      if (!emp || emp._id.toString() !== req.params.employeeId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const documents = await Document.find({ employee: req.params.employeeId })
      .populate('uploadedBy', 'name')
      .sort('-createdAt');

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Only the account owner or HR can delete documents
    const docEmployee = await Employee.findById(doc.employee);
    const isDocOwner = docEmployee && docEmployee.user.toString() === req.user._id.toString();
    const isHRUser = req.user.role === 'hr';
    if (!isDocOwner && !isHRUser) {
      return res.status(403).json({ message: 'Only the account owner or HR can delete documents' });
    }

    // Delete from Cloudinary with correct resource_type
    if (doc.publicId) {
      const isImage = doc.mimeType?.startsWith('image/');
      await cloudinary.uploader.destroy(doc.publicId, { resource_type: isImage ? 'image' : 'raw' }).catch(() => {});
    }

    await Document.findByIdAndDelete(req.params.id);

    await createAuditLog({
      userId: req.user._id,
      action: 'DELETE',
      module: 'Document',
      description: `Document "${doc.name}" deleted`,
      targetId: doc._id,
      targetModel: 'Document',
      ipAddress: req.ip
    });

    // Notify the employee about the document deletion
    if (docEmployee?.user) {
      await createNotification({
        recipientId: docEmployee.user,
        type: 'document_deleted',
        title: 'Document Removed',
        message: `Document "${doc.name}" has been removed from your profile`,
        link: `/employees/${docEmployee._id}`
      });
    }

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    View/stream document inline (proxy)
// @route   GET /api/documents/view/:id
export const viewDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Fetch the file from Cloudinary
    const response = await fetch(doc.url);
    if (!response.ok) return res.status(502).json({ message: 'Failed to fetch document' });

    // Set proper headers for inline viewing
    const contentType = doc.mimeType || 'application/octet-stream';
    const fileName = doc.name + (doc.name.includes('.') ? '' : getExtFromMime(contentType));
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Pipe the response body to client
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    await pump();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download document with proper filename
// @route   GET /api/documents/download/:id
export const downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const response = await fetch(doc.url);
    if (!response.ok) return res.status(502).json({ message: 'Failed to fetch document' });

    const contentType = doc.mimeType || 'application/octet-stream';
    const fileName = doc.name + (doc.name.includes('.') ? '' : getExtFromMime(contentType));
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    await pump();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper: get file extension from MIME type
function getExtFromMime(mime) {
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
  };
  return map[mime] || '';
}
