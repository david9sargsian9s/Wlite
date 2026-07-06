import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JwtData extends JwtPayload {
    id : string;
}

function getRefreshFromCheck(req : Request, res : Response, next : NextFunction) {
    const refresh = req.cookies.refreshToken;

    if(!refresh) {
        return res.status(400).json({ msg : "refresh token is invalid." })
    }

    const secret =  process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new Error("Critical error: JWT_REFRESH_SECRET is not defined.");
    }

    const verifyRefresh = jwt.verify(refresh, secret) as JwtData;

    res.locals.Uid = verifyRefresh.id;

    next();
}

export default getRefreshFromCheck;