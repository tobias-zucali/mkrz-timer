import useParams from "@/utils/useParams";
import { useEffect } from "react";

export default function useParamStyles() {
  const params = useParams();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--background",
      params.params.bg,
    );
    document.documentElement.style.setProperty(
      "--foreground",
      params.params.fg,
    );
    document.documentElement.style.setProperty(
      "--primary",
      params.params.p,
    );
  }, [params.params.bg, params.params.fg, params.params.p]);
}
