import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  variant?: ButtonVariant
}

function Button({
  asChild = false,
  children,
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = ['st-button', `st-button-${variant}`, className]
    .filter(Boolean)
    .join(' ')

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>

    return cloneElement(child, {
      className: [classes, child.props.className].filter(Boolean).join(' '),
    })
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  )
}

export { Button }
