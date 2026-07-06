import { ILogin, ITokens } from "../types/auth";
import { IModels } from "../types/models";
import { IUserDocument } from "../model/userModel";

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class AuthService {
    private model: IModels;

    constructor(model: IModels) {
        this.model = model;
    }

    async getToken(body : ILogin): Promise<ITokens | null> {
        const { email, password } = body;

        const user = await this.model.users.findOne({ email });

        if(!user) return null;

        const isValidPassword = await bcrypt.compare(password, user.password);

        if(!isValidPassword) return null;

        const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = process.env;
        
        if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
            throw new Error("Critical error: JWT secrets are not defined in the .env file.");
        }

        const accessToken = jwt.sign({ id : user._id }, JWT_ACCESS_SECRET, { expiresIn : '9m' });

        const refreshToken = jwt.sign({ id : user._id }, JWT_REFRESH_SECRET, { expiresIn : '40d' });

        await this.model.token.updateOne(
            { userID: String(user._id) as any },
            {
                $set: {
                    refresh: refreshToken
                }
            },
            { upsert: true }
        );

        return {
            accessToken,
            refreshToken
        };
    }

    async getNewAccessToken(Uid : string): Promise<string> {
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            throw new Error("Critical error: JWT_ACCESS_SECRET is not defined.");
        }
        const access = jwt.sign({ id : Uid }, secret, { expiresIn : '9m' });
        return access;
    }

    async getUser(id : string): Promise<IUserDocument | null> {
        return await this.model.users.findById(id);
    }

    async clearCookie(refreshToken : string) {
        const removeCookies = await this.model.token.deleteOne({ refresh : refreshToken });
        return removeCookies;
    }
}

export default AuthService;
