"use client";

import { useTranslation } from "react-i18next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export default function TermsPage() {
  const { t } = useTranslation();
  const sections: LegalSection[] = [
    {
      title: t("legal.terms.sections.service.title"),
      body: [
        t("legal.terms.sections.service.body1"),
        t("legal.terms.sections.service.body2"),
      ],
    },
    {
      title: t("legal.terms.sections.accounts.title"),
      body: [
        t("legal.terms.sections.accounts.body1"),
        t("legal.terms.sections.accounts.body2"),
      ],
    },
    {
      title: t("legal.terms.sections.use.title"),
      body: [
        t("legal.terms.sections.use.body1"),
        t("legal.terms.sections.use.body2"),
      ],
    },
    {
      title: t("legal.terms.sections.availability.title"),
      body: [
        t("legal.terms.sections.availability.body1"),
        t("legal.terms.sections.availability.body2"),
      ],
    },
    {
      title: t("legal.terms.sections.law.title"),
      body: [
        t("legal.terms.sections.law.body1"),
        t("legal.terms.sections.law.body2"),
      ],
    },
  ];

  return (
    <LegalPage
      eyebrow={t("legal.terms.eyebrow")}
      title={t("legal.terms.title")}
      effectiveDate={t("legal.effectiveDate")}
      intro={t("legal.terms.intro")}
      sections={sections}
    />
  );
}
