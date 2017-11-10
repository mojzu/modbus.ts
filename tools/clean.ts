import * as del from "del";
import * as path from "path";

/** Delete relative paths to absolute root. */
export function clean(root: string, targetPaths: string[]) {
  const absolutePaths = targetPaths.map((p) => path.join(root, p));
  return del(absolutePaths);
}
