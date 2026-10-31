import { activeSidebarItem } from '@/config/constants'
import {useAtom} from 'jotai'

const useSidebar = () => {
    const [activeSidebar, setActiveSidebar] = useAtom(activeSidebarItem)
    return { activeSidebar, setActiveSidebar }
}

export default useSidebar