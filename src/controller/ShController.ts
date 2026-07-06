import { Request, Response, NextFunction } from 'express';
import { shService } from '../service/Sh.Service';
import { UserModel } from '../model/userModel';

export class ShController {

  public async renderShell(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // We search for the current user's data using their token ID.
      const user = await UserModel.findById(req.user?.id);
      
      if (!user) {
        res.redirect('/login');
        return;
      }

      // We render the page and pass the username (or the default 'web-os') there.
      res.render('cli/shell', { 
        username: user.name 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /login
   * A normal synchronous method that returns the login page
   */
  public renderLogin(req: Request, res: Response): void {
    res.render('login');
  }

  /**
   * GET /register
   * Renders the registration page
   */
  public renderRegister(req: Request, res: Response): void {
    res.render('register');
  }


  /**
   * POST /api/shell
   * Terminal command handler
   */
  public async handleTerminalInput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { command } = req.body;
    
      if (command === undefined) {
        res.status(400).json({ error: 'Command field is required' });
        return;
      }
  
      const output = await shService.executeCommand(command, req.user);
  
      res.json({ output });
    } catch (error) {
      next(error);
    }
  }
}

export const shController = new ShController();
