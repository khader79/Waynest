import type { ReactNode } from "react";

type FeedProps = {
  children: ReactNode;
};

const Feed = ({ children }: FeedProps) => {
  return <div className="fb3-feedScroll">{children}</div>;
};

export default Feed;

