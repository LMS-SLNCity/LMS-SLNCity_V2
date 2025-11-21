import express, { Request, Response } from 'express';
import pool from '../db/connection.js';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Directory for storing signature images
const SIGNATURES_DIR = path.join(process.cwd(), 'public', 'signatures');

// Ensure signatures directory exists
if (!fs.existsSync(SIGNATURES_DIR)) {
  fs.mkdirSync(SIGNATURES_DIR, { recursive: true });
}

// Get signature for a user
router.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requestUser = (req as any).user;
    const { userId } = req.params;

    if (!requestUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Authorization: Users can only view their own signature, or admins can view for anyone
    if (requestUser.id !== parseInt(userId, 10) && !['SUDO', 'ADMIN'].includes(requestUser.role)) {
      return res.status(403).json({ error: 'Unauthorized: You can only view your own signature' });
    }

    const result = await pool.query(
      'SELECT id, signature_image_url FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = result.rows[0];
    res.json({
      userId: user.id,
      signatureImageUrl: user.signature_image_url,
    });
  } catch (error) {
    console.error('Error fetching signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload/Update signature for a user
router.post('/upload/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { imageData } = req.body; // Base64 encoded image data
    const requestUser = (req as any).user;

    // Authorization: Users can only upload their own signature, or admins can upload for anyone
    if (requestUser.id !== parseInt(userId) && !['SUDO', 'ADMIN'].includes(requestUser.role)) {
      return res.status(403).json({ error: 'Unauthorized: You can only upload your own signature' });
    }

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Validate base64 data
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Extract base64 string and file type - ONLY allow PNG and JPEG
    const matches = imageData.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Only PNG and JPEG are allowed' });
    }

    const [, fileType, base64Data] = matches;

    // Validate file size (2MB limit)
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSizeMB = buffer.length / (1024 * 1024);
    if (fileSizeMB > 2) {
      return res.status(400).json({
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds 2MB limit`
      });
    }

    const filename = `signature_${userId}_${Date.now()}.${fileType}`;
    const filepath = path.join(SIGNATURES_DIR, filename);

    // Write file
    fs.writeFileSync(filepath, buffer);

    // Update database
    const signatureUrl = `/signatures/${filename}`;
    const result = await pool.query(
      'UPDATE users SET signature_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, signature_image_url',
      [signatureUrl, userId]
    );

    if (result.rows.length === 0) {
      // Clean up file if user not found
      fs.unlinkSync(filepath);
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId: result.rows[0].id,
      signatureImageUrl: result.rows[0].signature_image_url,
      message: 'Signature uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete signature for a user
router.delete('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requestUser = (req as any).user;
    const { userId } = req.params;

    if (!requestUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Authorization: Users can only delete their own signature, or admins can delete for anyone
    if (requestUser.id !== parseInt(userId, 10) && !['SUDO', 'ADMIN'].includes(requestUser.role)) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own signature' });
    }

    const result = await pool.query(
      'SELECT signature_image_url FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const signatureUrl = result.rows[0].signature_image_url;
    if (signatureUrl && typeof signatureUrl === 'string' && signatureUrl.startsWith('/signatures/')) {
      const filepath = path.join(SIGNATURES_DIR, path.basename(signatureUrl));
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }

    // Update database
    await pool.query(
      'UPDATE users SET signature_image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Signature deleted successfully' });
  } catch (error) {
    console.error('Error deleting signature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

