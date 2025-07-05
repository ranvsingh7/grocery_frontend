import {jwtDecode} from "jwt-decode";

export function getDecodedToken<T>(cookieName: string): T | null {
    if (typeof window === "undefined") {
        // If running on the server, return null
        return null;
    }

    try {
        const cookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${cookieName}=`));

        if (!cookie) return null;

        const token = cookie.split("=")[1];
        return jwtDecode<T>(token);
    } catch (error) {
        return null;
    }
}
