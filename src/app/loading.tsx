import { getTranslations } from "next-intl/server";

import { PageLoader } from "@/components/page-loader";

export default async function Loading() {
  const t = await getTranslations("common");
  return <PageLoader label={t("loading")} />;
}
