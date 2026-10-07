import jwt from "jsonwebtoken";

export const isAuthenticated = async (req, res, next) => {
    try {
        let token = req.cookies?.token;

        // Fallback to Authorization header (Bearer token) for Incognito mode & cross-domain cookie restrictions
        if (!token && req.headers?.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            } else {
                token = authHeader;
            }
        }

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized. Please login."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};