import { UserModel } from '../model/userModel';
import { tokenModel } from '../model/tokenModel';

// We describe the type for the user that comes from req.user
interface IShellUser {
  id: string;
  role: 'user' | 'moderator' | 'admin';
}

export class ShService {
  public async executeCommand(rawCommand: string, currentUser?: IShellUser): Promise<string> {
    if (!rawCommand) return '';

    // If somehow the middleware didn't work and there is no user
    if (!currentUser) {
      return '\x1b[31mcore-sh: Unauthorized access.\x1b[0m';
    }

    const args = rawCommand.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    // --- LEVEL 1: PUBLIC COMMANDS (Available to everyone, including the 'user' role) ---
    switch (cmd) {
      case 'help':
        let helpText = 'Web OS Available commands:\n' +
                       '  help      - Show this manual\n' +
                       '  whoami    - Show current active user\n' +
                       '  sysinfo   - Get server environment stats';
        
        // Dynamically expand the help if the user has elevated rights
        if (currentUser.role === 'moderator' || currentUser.role === 'admin') {
          helpText += '\n\n[Management Commands]:\n' +
                      '  users     - List registered accounts (Moderator/Admin)\n' +
                      '  ban       - Ban user by email (Admin only)';
        }
        return helpText;

      case 'clear':
      return '__CLEAR_SCREEN__';  

      case 'whoami':
        return `User ID: ${currentUser.id}\nRole: [${currentUser.role}] (authenticated)`;

      case 'sysinfo':
        return `OS Node Version: ${process.version}\n` +
               `Platform: ${process.platform}\n` +
               `Uptime: ${Math.floor(process.uptime())}s`; 
      
      case 'logout':
        return '__LOGOUT_USER__';
    }

    // --- LEVEL 2: MODERATOR AND ADMINISTRATOR TEAMS ---
    if (cmd === 'users') {
      if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
        return '\x1b[31mcore-sh: Permission denied. You need to be a Moderator or Admin.\x1b[0m';
      }

      const users = await UserModel.find().limit(10).select('name email role status');
      let result = 'Registered OS Users:\n';
      users.forEach((u) => {
        const color = u.status === 'banned' ? '\x1b[31m' : '\x1b[32m';
        result += `- ${u.name} [${u.email}] | Role: ${u.role} | Status: ${color}${u.status}\x1b[0m\n`;
      });
      return result.trim();
    }

    // --- LEVEL 3: HIGHLY CRITICAL COMMANDS ('admin' only) ---
    if (cmd === 'ban') {
      if (currentUser.role !== 'admin') {
        return '\x1b[31mcore-sh: Permission denied. This is a critical command. Critical actions are restricted for your role.\x1b[0m';
      }

      const targetEmail = args[1];
      if (!targetEmail) {
        return '\x1b[31mUsage: ban <email>\x1b[0m';
      }

      // We prohibit the admin from banning himself
      const targetUser = await UserModel.findOne({ email: targetEmail.toLowerCase() });
      if (!targetUser) return '\x1b[31mError: User not found.\x1b[0m';
      if (targetUser._id.toString() === currentUser.id) {
        return '\x1b[31mError: You cannot ban yourself.\x1b[0m';
      }

      // We are making a critical change to the database
      targetUser.status = 'banned';
      await targetUser.save();

      // Resetting the banned user's sessions (removing refresh tokens)
      await tokenModel.deleteMany({ userID: targetUser._id as any });

      return `\x1b[32mSuccess: User [${targetEmail}] has been banned. Active sessions terminated.\x1b[0m`;
    }

    // If the team did not fit any of the cases
    return `\x1b[31mcore-sh: command not found: ${cmd}\x1b[0m`;
  }
}

export const shService = new ShService();
