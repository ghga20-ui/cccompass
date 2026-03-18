"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, GraduationCap, Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { interestTags, getDepartmentsByTagId } from "@/data/career-mapping";
import { useCohort, type CohortYear } from "@/contexts/CohortContext";
import { searchDeptAndCareers, type SearchResult } from "@/data/search-index";

const cohortOptions: { year: CohortYear; title: string; desc: string }[] = [
  {
    year: "2026",
    title: "고1",
    desc: "2026학년도 입학",
  },
  {
    year: "2025",
    title: "고2",
    desc: "2025학년도 입학",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { cohort, setCohort } = useCohort();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTagDept, setSelectedTagDept] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDept, setSelectedDept] = useState<SearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // 2-level: 선택된 태그의 학과 목록
  const tagDepartments = useMemo(() => {
    if (selectedTags.length === 0) return [];
    return getDepartmentsByTagId(selectedTags[0]);
  }, [selectedTags]);

  // Search as user types
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = searchDeptAndCareers(searchQuery);
    setSearchResults(results.slice(0, 8));
    setShowDropdown(results.length > 0);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSearchResult = useCallback((result: SearchResult) => {
    setSelectedDept(result);
    setSearchQuery("");
    setShowDropdown(false);
    // Clear interest tags when search is used
    setSelectedTags([]);
    setSelectedTagDept(null);
  }, []);

  const handleClearDept = useCallback(() => {
    setSelectedDept(null);
    setSearchQuery("");
  }, []);

  const isSearchMode = selectedDept !== null;

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        // Deselect
        setSelectedTagDept(null);
        return [];
      }
      // Single select: replace previous
      setSelectedTagDept(null);
      // Clear search mode when tag is selected
      setSelectedDept(null);
      setSearchQuery("");
      return [tagId];
    });
  };

  const handleNext = () => {
    if (isSearchMode && selectedDept) {
      const params = new URLSearchParams();
      params.set("dept", selectedDept.departmentName);
      router.push(`/recommend?${params.toString()}`);
      return;
    }
    if (selectedTagDept) {
      const params = new URLSearchParams();
      params.set("dept", selectedTagDept);
      router.push(`/recommend?${params.toString()}`);
      return;
    }
    if (selectedTags.length === 0) return;
    const params = new URLSearchParams();
    params.set("interests", selectedTags.join(","));
    router.push(`/recommend?${params.toString()}`);
  };

  const canProceed = isSearchMode || selectedTagDept !== null || selectedTags.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Hero */}
      <section className="px-5 pt-10 pb-6 md:pt-16 md:text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 flex items-center gap-2.5 md:justify-center">
            <img src="/school-logo.png" alt="효자고등학교 로고" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-2xl font-bold text-foreground tracking-tight">효자고등학교</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
            나에게 딱 맞는
            <br />
            <span className="text-[var(--primary)]">선택과목</span>을 찾아보자!
          </h1>
          <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed md:text-base">
            우리 학교 편제표 기반
            <br className="md:hidden" />
            맞춤 과목을 추천해줄게
          </p>
        </div>
      </section>

      {/* Cohort selection */}
      <section className="px-5 pb-4">
        <div className="mx-auto max-w-lg">
          <div className="mb-2.5 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-medium text-foreground">
              나는 어디에 해당하나요?
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {cohortOptions.map((opt) => {
              const isSelected = cohort === opt.year;
              return (
                <button
                  key={opt.year}
                  onClick={() => setCohort(opt.year)}
                  className="text-center"
                >
                  <Card
                    className={cn(
                      "transition-all active:scale-[0.98]",
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)] shadow-md"
                        : "border-border bg-card hover:border-[var(--primary)]/30"
                    )}
                  >
                    <CardContent className="p-3.5">
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          isSelected ? "text-white" : "text-foreground"
                        )}
                      >
                        {opt.title}
                      </p>
                      <p className={cn(
                        "mt-0.5 text-xs",
                        isSelected ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {opt.desc}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search input */}
      <section className="px-5 pb-4">
        <div className="mx-auto max-w-lg">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Search className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-medium text-foreground">
              학과로 검색
            </h2>
          </div>

          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="학과를 검색해봐! (예: 컴퓨터공학과, 간호학과)"
                disabled={isSearchMode}
                className={cn(
                  "w-full min-h-[44px] rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all",
                  "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
                  isSearchMode && "opacity-50 pointer-events-none"
                )}
              />
            </div>

            {/* Autocomplete dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.type}-${result.label}-${result.departmentName}-${idx}`}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left hover:bg-[var(--primary)]/5 transition-colors border-b border-border/50 last:border-b-0"
                  >
                    <span className="text-lg shrink-0">{"\uD83C\uDF93"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.fieldName} · {result.trackName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected department chip */}
          {selectedDept && (
            <div className="mt-3 flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 min-h-[44px]">
                <span className="text-sm">{"\uD83C\uDF93"}</span>
                <span className="text-sm font-medium text-[var(--primary)]">
                  {selectedDept.label}
                </span>
                <button
                  onClick={handleClearDept}
                  className="ml-1 rounded-full p-0.5 hover:bg-[var(--primary)]/20 transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-[var(--primary)]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 구분선 */}
      <div className="px-5">
        <div className="mx-auto max-w-lg">
          <hr className="border-border" />
        </div>
      </div>

      {/* Tag selector */}
      <section className={cn(
        "flex-1 px-5 pt-4 pb-6 transition-all",
        isSearchMode && "opacity-40 pointer-events-none"
      )}>
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              관심 분야를 골라봐!
            </h2>
            {selectedTags.length > 0 && (
              <span className="text-xs font-medium text-[var(--primary)]">
                {interestTags.find(t => t.id === selectedTags[0])?.label} 선택됨
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* 선택된 태그 먼저 */}
            {interestTags.filter(tag => selectedTags.includes(tag.id)).map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
                  "min-h-[44px]",
                  "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                )}
              >
                {tag.label}
              </button>
            ))}

            {/* 세부학과 패널: 선택된 태그 바로 아래 */}
            {selectedTags.length > 0 && tagDepartments.length > 0 && (
              <div
                className="w-full mt-1 mb-2 rounded-xl border border-border bg-card p-4 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="mb-3 flex items-center gap-1.5">
                  <ChevronDown className="h-4 w-4 text-[var(--primary)]" />
                  <p className="text-sm font-medium text-foreground">
                    &ldquo;{interestTags.find(t => t.id === selectedTags[0])?.label}&rdquo; 관련 학과를 선택해봐
                  </p>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  선택하지 않아도 추천받을 수 있어
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {tagDepartments.map((dept) => {
                    const isDeptSelected = selectedTagDept === dept.name;
                    return (
                      <button
                        key={dept.name}
                        onClick={() =>
                          setSelectedTagDept(prev =>
                            prev === dept.name ? null : dept.name
                          )
                        }
                        className={cn(
                          "min-h-[44px] rounded-lg border p-2.5 text-left transition-all active:scale-[0.98]",
                          isDeptSelected
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-sm"
                            : "border-border bg-background hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
                        )}
                      >
                        <p className={cn(
                          "text-sm font-semibold leading-tight",
                          isDeptSelected ? "text-[var(--primary)]" : "text-foreground"
                        )}>
                          {dept.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {dept.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 나머지 미선택 태그 */}
            {interestTags.filter(tag => !selectedTags.includes(tag.id)).map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95",
                  "min-h-[44px]",
                  "border-border bg-card text-foreground hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sticky bottom-[72px] z-30 border-t border-border bg-card/95 backdrop-blur-md px-5 py-3 md:bottom-0">
        <div className="mx-auto max-w-lg">
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              "w-full h-12 rounded-xl text-base font-semibold transition-all",
              canProceed
                ? "bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white shadow-lg shadow-[var(--cta)]/25"
                : "bg-muted text-muted-foreground"
            )}
          >
            맞춤 과목 추천받기
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
