import { Request, Response } from 'express';
import { Id } from '../types/id';

class UserController {
    async createUser(req : Request, res : Response) {
        try {
            const user = await req.app.locals.services.users.createUser(req.body);
            res.status(200).set({
                'content-type' : 'application/json',
                'Cache-Control' : 'max-age=70'
            }).json({ user });
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }

    async updateUser(req : Request, res : Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "the user is not authorized." });
            }

            const targetId : Id = req.params.id;
            const Uid = req.user.id;
            
            const UpdatedInfo = await req.app.locals.services.users.updateUser(targetId, req.body);
            res.status(200).set({
                'content-type' : 'application/json',
                'Cache-Control' : 'max-age=70',
            }).json({ UpdatedInfo });
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }

    async deleteUser(req : Request, res : Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error : "the user is not authorized or is not defined." });
            }

            const targetId : Id = req.params.id;
            const Uid = req.user.id;

            const deleted = await req.app.locals.services.users.deleteUser(targetId);

            return res.status(200).json({ success : true, deleted })
        } catch (error : unknown) {
            if (error instanceof Error) {
                return res.status(400).json({ error: error.message });
            }
            res.status(400).json({ error : error })
        }
    }
}

export default UserController;