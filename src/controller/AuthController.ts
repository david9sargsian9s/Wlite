import { Request, Response } from "express";

class AuthController {
    async getToken(req : Request, res : Response) {
        try {
            const tokens = await req.app.locals.services.auth.getToken(req.body);

            if (!tokens) {
                return res.status(400).json({ msg : "invalid credentials." });
            }

            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly : true,
                secure : false,
                sameSite: "lax",
                path: '/',
                maxAge : 7 * 24 * 60 * 60 * 1000
            });

            res.cookie('accessToken', tokens.accessToken, {
                httpOnly : true,
                secure : false,
                sameSite: "lax",
                path: '/',
                maxAge : 9 * 60 * 1000,
            });

            res.status(200).json({ accessToken : tokens.accessToken });
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }


    async getNewAccessToken(req : Request, res : Response) {
        try {
            const newToken = await req.app.locals.services.auth.getNewAccessToken(res.locals.Uid);

            return res.status(200).json({ newToken });
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }

    async getUser(req : Request, res : Response) {
        try {
            const user = await req.app.locals.services.auth.getUser(res.locals.Uid);

            return res.status(200).json(user);
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }

    async clearCookie(req : Request, res : Response) {
        try {
            await req.app.locals.services.auth.clearCookie(req.cookies.refreshToken);

            res.clearCookie("refreshToken");

            return res.status(200).json({ msg : "cookies deleted successfuly." })
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }
}

export default AuthController;
