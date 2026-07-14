import { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { UserModel } from '../model/userModel';


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI 
);

export const getGoogleAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; 

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized shell session' });
    }

    const scopes = ['https://www.googleapis.com/auth/drive.file'];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', 
      scope: scopes,
      prompt: 'consent', 
      state: userId 
    });

    res.json({ url });
  } catch (error) {
    next(error);
  }
};

export const handleGoogleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query; // Google возвращает временный код и наш state (userId)

    if (!code || !state) {
      return res.status(400).send('Missing authorization code or state mapping.');
    }

    const userId = state as string;

    const { tokens } = await oauth2Client.getToken(code as string);

    await UserModel.findByIdAndUpdate(userId, {
      googleDrive: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null, 
        expiryDate: tokens.expiry_date,
        isConnected: true
      }
    });

    res.send(`
      <div style="font-family: monospace; text-align: center; margin-top: 50px; background: #111; color: #0f0; padding: 20px; height: 100vh;">
        <h2>[ WFS ENGINE INITIALIZED SUCCESS ]</h2>
        <p>Google Drive has been successfully linked to your Core Web OS Profile.</p>
        <p style="color: #888;">You can close this tab now and return to your terminal shell.</p>
      </div>
    `);
  } catch (error) {
    next(error);
  }
};