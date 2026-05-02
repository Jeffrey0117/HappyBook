import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link2, 
  Heading1,
  Heading2,
  Heading3,
  Minus
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string, placeholder?: string) => void;
}

const MarkdownToolbar = ({ onInsert }: MarkdownToolbarProps) => {
  const tools = [
    { 
      icon: <Bold className="h-4 w-4" />, 
      title: "粗體 (Ctrl+B)", 
      action: () => onInsert("**", "**", "粗體文字")
    },
    { 
      icon: <Italic className="h-4 w-4" />, 
      title: "斜體 (Ctrl+I)", 
      action: () => onInsert("*", "*", "斜體文字")
    },
    { 
      icon: <Heading1 className="h-4 w-4" />, 
      title: "標題 1", 
      action: () => onInsert("# ", "", "標題")
    },
    { 
      icon: <Heading2 className="h-4 w-4" />, 
      title: "標題 2", 
      action: () => onInsert("## ", "", "標題")
    },
    { 
      icon: <Heading3 className="h-4 w-4" />, 
      title: "標題 3", 
      action: () => onInsert("### ", "", "標題")
    },
    { 
      icon: <List className="h-4 w-4" />, 
      title: "無序列表", 
      action: () => onInsert("- ", "", "列表項目")
    },
    { 
      icon: <ListOrdered className="h-4 w-4" />, 
      title: "有序列表", 
      action: () => onInsert("1. ", "", "列表項目")
    },
    { 
      icon: <Quote className="h-4 w-4" />, 
      title: "引用", 
      action: () => onInsert("> ", "", "引用文字")
    },
    { 
      icon: <Code className="h-4 w-4" />, 
      title: "程式碼", 
      action: () => onInsert("`", "`", "程式碼")
    },
    { 
      icon: <Link2 className="h-4 w-4" />, 
      title: "連結", 
      action: () => onInsert("[", "](url)", "連結文字")
    },
    { 
      icon: <Minus className="h-4 w-4" />, 
      title: "分隔線", 
      action: () => onInsert("\n---\n", "", "")
    },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border rounded-t-md bg-muted/30">
      {tools.map((tool, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={tool.action}
              className="h-8 w-8 p-0"
            >
              {tool.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tool.title}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

export default MarkdownToolbar;