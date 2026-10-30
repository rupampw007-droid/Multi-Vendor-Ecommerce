import { useRouter } from "next/router"
import useUser from "./useUser";
import { useEffect } from "react";


const useRequireAuth = () => {
    const router = useRouter();
    const {user, isLoading} = useUser();

    useEffect(() => {
        if(!isLoading && !user) {
            router.replace("/login")
        }
    }, [user, isLoading, router])

    return { user, isLoading }
}

export default useRequireAuth