import { Link, useNavigate } from "react-router-dom";
import { Star, BookMarked, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";
import { useState } from "react";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  tags: string[];
  progress: "未讀" | "閱讀中" | "已讀";
  rating?: number;
  onDelete?: (id: string) => void;
}

const progressColors = {
  未讀: "bg-muted text-muted-foreground",
  閱讀中: "bg-secondary/20 text-secondary",
  已讀: "bg-primary/20 text-primary",
};

const BookCard = ({ id, title, author, tags, progress, rating, onDelete }: BookCardProps) => {
  const navigate = useNavigate();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showActions, setShowActions] = useState(false);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (eventData.dir === "Left") {
        const offset = Math.min(Math.abs(eventData.deltaX), 160);
        setSwipeOffset(-offset);
      }
    },
    onSwipedLeft: () => {
      setShowActions(true);
      setSwipeOffset(-160);
    },
    onSwipedRight: () => {
      setShowActions(false);
      setSwipeOffset(0);
    },
    trackMouse: false,
    trackTouch: true,
  });

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/add/${id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-[120px]" {...handlers}>
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center gap-2 px-4 bg-destructive/10"
        style={{ width: '160px' }}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={handleEdit}
          className="h-16 w-16 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Edit className="h-6 w-6" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={handleDelete}
          className="h-16 w-16"
        >
          <Trash2 className="h-6 w-6" />
        </Button>
      </div>
      <Link
        to={`/book/${id}`}
        className="block min-h-[120px] relative transition-transform duration-200"
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >
        <Card className="group hover:shadow-md transition-all duration-300 hover:scale-[1.02] h-full min-h-[120px]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{author}</p>
            </div>
            <BookMarked className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors flex-shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={cn("text-xs", progressColors[progress])}>
              {progress}
            </Badge>
            {rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < rating ? "fill-secondary text-secondary" : "text-muted"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
    </div>
  );
};

export default BookCard;
