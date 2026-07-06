import { Request, Response, NextFunction } from 'express';
import ac from '../config/accessControl';

type ActionType = 'create' | 'read' | 'update' | 'delete';
type ResourceType = 'user' | 'product';

export function checkPermission(action: ActionType, resource: ResourceType, isOwn: boolean = false) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            if (req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ error: "Unauthorized: Please log in." });
            }
            return res.redirect('/auth/login');
        }

        const role = req.user.role;
        let permission;

        if (isOwn) {
            const targetId = req.params.id;
            const isOwner = req.user.id === targetId;

            if (isOwner) {
                permission = ac.can(role)[`${action}Own`](resource);
            } else {
                permission = ac.can(role)[`${action}Any`](resource);
            }
        } else {
            permission = ac.can(role)[`${action}Any`](resource);
        }

        if (permission.granted) {
            return next();
        }

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({ error: "Access denied: Insufficient permissions." });
        }
        return res.redirect('/no-access');
    };
}