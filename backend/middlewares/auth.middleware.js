import jwt from "jsonwebtoken";

export const isAuthenticated = async (req, res, next) => {
    const isMeEndpoint = req.originalUrl?.includes("/users/me") || req.path === "/me";

    const handleUnauthorized = (message = "Unauthorized. Please login.") => {
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", "", {
            expires: new Date(0),
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        // For /me endpoint, returning 200 with { success: false } allows the frontend's
        // refreshUser handler to gracefully wipe localStorage (user & token) and redirect
        // straight to /login, rather than catching a 401 error and keeping stale user in state.
        if (isMeEndpoint) {
            return res.status(200).json({
                success: false,
                message: message
            });
        }

        return res.status(401).json({
            success: false,
            message: message
        });
    };

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
            return handleUnauthorized("Unauthorized. Please login.");
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        next();
    } catch (error) {
        return handleUnauthorized("Invalid or expired token.");
    }
};