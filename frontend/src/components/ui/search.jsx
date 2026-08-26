import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SearchBar = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={ref}
        className="pl-10"
        {...props}
      />
    </div>
  )
})
SearchBar.displayName = "SearchBar"

export { SearchBar }
