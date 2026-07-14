import { google } from 'googleapis';
import { UserModel } from '../model/userModel';

export class VfsService {
  private static getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Generate a link for a specific session user
  public static generateAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/drive.file'];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId // Pass the session user ID to state
    });
  }

  // Quick check: is the drive already mapped?
  public static async isConnected(userId: string): Promise<boolean> {
    const user = await UserModel.findById(userId);
    return !!user?.googleDrive?.isConnected;
  }
}