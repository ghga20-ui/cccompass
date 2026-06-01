import "@testing-library/jest-dom/vitest";

import fs from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const appRoot = path.resolve(__dirname, "../..");

afterEach(() => {
  cleanup();
});

describe("Hyoja UI foundation", () => {
  it("renders Hyoja Button Card and Badge with theme classes", () => {
    render(
      <Card data-testid="hyoja-card">
        <CardHeader>
          <CardTitle>Subject helper</CardTitle>
          <CardDescription>Student selection flow</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Grade 2</Badge>
          <Button className="mt-3">Start</Button>
        </CardContent>
      </Card>,
    );

    expect(screen.getByRole("button", { name: "Start" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
    expect(screen.getByText("Grade 2")).toHaveClass(
      "bg-secondary",
      "text-secondary-foreground",
    );
    expect(screen.getByTestId("hyoja-card")).toHaveClass(
      "rounded-xl",
      "bg-card",
      "text-card-foreground",
    );

    const globals = fs.readFileSync(
      path.join(appRoot, "src/app/globals.css"),
      "utf8",
    );
    expect(globals).toContain("--color-cta: var(--cta)");
    expect(globals).toContain(".pb-safe");
    expect(globals).toContain("--background: #FFFBEB");
    expect(fs.existsSync(path.join(appRoot, "public/school-logo.png"))).toBe(
      true,
    );
    expect(cn("px-2 px-4", false && "hidden")).toBe("px-4");
  });

  it("keeps disabled Hyoja buttons non-interactive", () => {
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Locked
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Locked" });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:pointer-events-none");
    expect(button).toHaveClass("disabled:opacity-50");
    expect(handleClick).not.toHaveBeenCalled();
  });
});
