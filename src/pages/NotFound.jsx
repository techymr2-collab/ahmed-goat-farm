import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="That page doesn't exist. It may have moved."
      action={
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Go to the dashboard
        </Link>
      }
    />
  )
}
