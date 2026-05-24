import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Register page dihapus — semua auth via Google di Login
export default function Register() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/login', { replace: true })
  }, [])
  return null
}
