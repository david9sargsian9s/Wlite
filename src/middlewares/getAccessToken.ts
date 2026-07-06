import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../model/userModel';

async function getAccessFromCheck(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.accessToken;

    if (!token) {
        if (req.method === 'GET') return res.redirect('/login');
        return res.status(401).json({ error: "Unauthorized: Token missing." });
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("Critical error: JWT_ACCESS_SECRET is not defined.");
    }

    try {
        const decoded = jwt.verify(token, secret) as { id: string };

        const user = await UserModel.findById(decoded.id);
        if (!user) {
            if (req.method === 'GET') return res.redirect('/login');
            return res.status(401).json({ error: "User not found." });
        }

        req.user = {
            id: user._id.toString(),
            role: user.role // 'user' | 'moderator' | 'admin'
        };

        return next();
    } catch (error: unknown) {
        if (req.method === 'GET') return res.redirect('/login');
        
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(400).json({ error: error });
    }
}

export default getAccessFromCheck;
