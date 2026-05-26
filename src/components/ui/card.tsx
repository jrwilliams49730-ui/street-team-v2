import type { HTMLAttributes } from 'react'

function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['st-card', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['st-card-content', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export { Card, CardContent }
