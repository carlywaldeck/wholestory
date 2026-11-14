import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';
export type ButtonProps=React.ComponentProps<'button'>&{asChild?:boolean};
export function Button({className,asChild=false,...props}:ButtonProps){const Comp=asChild?Slot:'button';return <Comp data-slot="button" className={cn('button',className)} {...props}/>;}
