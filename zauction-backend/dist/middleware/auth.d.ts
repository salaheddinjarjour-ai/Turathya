import { Request, Response, NextFunction } from 'express';
export type AuthRequest = Request & {
    user?: {
        id: string;
        email: string;
        role: string;
        status: string;
    };
    file?: any;
};
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireApproved: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map