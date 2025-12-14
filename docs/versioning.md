# **webette Versioning Guide**

webette uses a **hybrid versioning model** designed to be simple, predictable, and expressive.
It combines a high-level _generation number_ with a _calendar-based release cycle_.

This format is:

```
v<generation> <YYYY.MM>.<increment>
```

Example:

```
v1 2025.12.1
```

---

## **1. Components of the Version Number**

### **Generation (`v1`, `v2`, …)**

A broad milestone.
This number only changes when webette reaches a significant stage in its evolution —
major architectural improvements, new foundations, or a major shift in how the tool works.

This is **not** tied to breaking changes.
It’s simply a way to mark eras of the project.

### **Calendar Release (`YYYY.MM`)**

A datestamp that indicates the release cycle.

- `YYYY` → year
- `MM` → month

This makes versions easy to interpret at a glance and avoids ambiguity around compatibility rules.

### **Increment (`.0`, `.1`, `.2`, …)**

A sequential counter for releases within the same month.
It resets at the beginning of each new month.

Examples:

- First release of the month → `.0`
- Small follow-up or fix → `.1`
- Additional feature or patch → `.2`

---

## **2. Examples**

```
v1 2025.12.0   → First December 2025 release
v1 2025.12.1   → Follow-up release: fixes or additions
v1 2026.01.0   → New month, counter resets
v2 2026.05.0   → New project era / major milestone
```

This scheme sorts naturally and remains easily readable.

---

## **3. How to Decide the Generation Number**

Increase the generation only when:

- a foundational refactor lands,
- the internal architecture evolves significantly,
- the philosophy or target audience of webette shifts,
- or when you feel the project enters a new “chapter.”

Do _not_ increment the generation for:

- normal feature additions,
- breaking changes,
- bug fixes,
- plugin API updates.

Generations represent **eras**, not compatibility.

---

## **4. Why This Model?**

webette’s versioning system is designed to avoid the confusion of traditional SemVer while remaining meaningful:

- **Readable:** users immediately know _when_ a version came out.
- **Flexible:** no need to classify changes as major/minor/patch.
- **Structured:** generations give long-term coherence.
- **Release-friendly:** perfect for a tool that evolves incrementally and experimentally.

It reflects the way webette grows: organically, creatively, and with clarity.

---

## **5. Summary**

The official version format is:

```
v<generation> <YYYY.MM>.<increment>
```

- **Generation** → big milestones
- **Date** → when the release happened
- **Increment** → multiple releases in the same month

This model is simple, descriptive, future-proof, and works beautifully with webette’s philosophy.
