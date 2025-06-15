"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Clock,
  Upload,
  FileText,
  Check,
  X,
  ChevronDown,
  AlertCircle,
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
} from "lucide-react";

interface ValidationErrors {
  jobTitle?: string;
  jobDescription?: string;
  location?: string;
  requirements?: string;
  education?: string;
  experience?: string;
  employmentTypes?: string;
  selectedSchedules?: string;
  salaryAmount?: string;
  deadline?: string;
}

interface PendingJobOffer {
  id: string;
  data: any;
  timestamp: number;
  attempts: number;
}

export default function JobPostingForm() {
  const [activeTab, setActiveTab] = useState("manual");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [location, setLocation] = useState("");
  const [requirements, setRequirements] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [deadline, setDeadline] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [employmentTypes, setEmploymentTypes] = useState({
    fullTime: true,
    partTime: true,
    onDemand: false,
    negotiable: false,
  });
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [paymentType, setPaymentType] = useState("custom");
  const [salaryAmount, setSalaryAmount] = useState("35,000");
  const [paymentFrequency, setPaymentFrequency] = useState("yearly");
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [hiringMultiple, setHiringMultiple] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [apiStatus, setApiStatus] = useState<
    "unknown" | "connected" | "disconnected"
  >("unknown");
  const [pendingOffers, setPendingOffers] = useState<PendingJobOffer[]>([]);

  const saveJobDescriptionToStorage = (description: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("jobDescription", description);
    }
  };

  const loadJobDescriptionFromStorage = (): string => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jobDescription") || "";
    }
    return "";
  };

  const clearJobDescriptionFromStorage = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("jobDescription");
    }
  };

  const savePendingOfferToStorage = (offer: PendingJobOffer) => {
    if (typeof window !== "undefined") {
      const existingOffers = JSON.parse(
        localStorage.getItem("pendingJobOffers") || "[]"
      );
      const updatedOffers = [...existingOffers, offer];
      localStorage.setItem("pendingJobOffers", JSON.stringify(updatedOffers));
      setPendingOffers(updatedOffers);
    }
  };

  const loadPendingOffersFromStorage = (): PendingJobOffer[] => {
    if (typeof window !== "undefined") {
      const offers = JSON.parse(
        localStorage.getItem("pendingJobOffers") || "[]"
      );
      setPendingOffers(offers);
      return offers;
    }
    return [];
  };

  const removePendingOfferFromStorage = (offerId: string) => {
    if (typeof window !== "undefined") {
      const existingOffers = JSON.parse(
        localStorage.getItem("pendingJobOffers") || "[]"
      );
      const updatedOffers = existingOffers.filter(
        (offer: PendingJobOffer) => offer.id !== offerId
      );
      localStorage.setItem("pendingJobOffers", JSON.stringify(updatedOffers));
      setPendingOffers(updatedOffers);
    }
  };

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleOptions = ["Day shift", "Night shift", "Weekend availability"];
  const educationOptions = [
    "High School",
    "Bachelor's Degree",
    "Master's Degree",
    "PhD",
    "Professional Certificate",
    "No formal education required",
  ];

  useEffect(() => {
    const loadContent = () => {
      const savedDescription = loadJobDescriptionFromStorage();
      if (savedDescription && editorRef.current) {
        editorRef.current.innerHTML = savedDescription;
        setJobDescription(savedDescription);
        setTimeout(() => {
          updateWordCount();
        }, 100);
      }
    };

    loadContent();
    const timer = setTimeout(loadContent, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (jobDescription) {
      saveJobDescriptionToStorage(jobDescription);
    }
  }, [jobDescription]);

  useEffect(() => {
    checkAPIConnection();
    loadPendingOffersFromStorage();
    startRetryProcess();

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, []);

  const checkAPIConnection = async () => {
    try {
      const response = await fetch("http://localhost:5000/offers/", {
        method: "GET",
        mode: "cors",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        setApiStatus("connected");
        return true;
      } else {
        setApiStatus("disconnected");
        return false;
      }
    } catch (error) {
      setApiStatus("disconnected");
      return false;
    }
  };

  const hasPendingOffers = (): boolean => {
    if (typeof window !== "undefined") {
      const offers = JSON.parse(
        localStorage.getItem("pendingJobOffers") || "[]"
      );
      return offers.length > 0;
    }
    return false;
  };

  const startRetryProcess = () => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
    }

    if (!hasPendingOffers()) {
      return;
    }

    retryIntervalRef.current = setInterval(async () => {
      const isConnected = await checkAPIConnection();
      if (isConnected) {
        await processPendingOffers();
      }
    }, 12 * 60 * 60 * 1000);
  };

  const processPendingOffers = async () => {
    const offers = loadPendingOffersFromStorage();

    if (offers.length === 0) {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
      return;
    }

    for (const offer of offers) {
      try {
        await submitToFlaskAPI(offer.data);
        removePendingOfferFromStorage(offer.id);
        console.log(`Successfully submitted pending offer: ${offer.id}`);
      } catch (error) {
        console.log(`Failed to submit pending offer: ${offer.id}`, error);
      }
    }

    const remainingOffers = loadPendingOffersFromStorage();
    if (remainingOffers.length === 0) {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!jobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    } else if (jobTitle.trim().length < 3) {
      newErrors.jobTitle = "Job title must be at least 3 characters";
    }

    if (!jobDescription.trim() || jobDescription.trim() === "<br>") {
      newErrors.jobDescription = "Job description is required";
    } else if (wordCount < 10) {
      newErrors.jobDescription = "Job description must be at least 10 words";
    }

    if (!location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!requirements.trim()) {
      newErrors.requirements = "Requirements are required";
    }

    if (!education.trim()) {
      newErrors.education = "Education level is required";
    }

    if (!experience.trim()) {
      newErrors.experience = "Experience is required";
    }

    if (!deadline.trim()) {
      newErrors.deadline = "Application deadline is required";
    }

    const hasSelectedEmploymentType =
      Object.values(employmentTypes).some(Boolean);
    if (!hasSelectedEmploymentType) {
      newErrors.employmentTypes =
        "At least one employment type must be selected";
    }

    if (selectedSchedules.length === 0) {
      newErrors.selectedSchedules =
        "At least one working schedule must be selected";
    }

    if (!salaryAmount.trim()) {
      newErrors.salaryAmount = "Salary amount is required";
    } else if (isNaN(Number(salaryAmount.replace(/,/g, "")))) {
      newErrors.salaryAmount = "Please enter a valid salary amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || "";
      const cleanText = text.replace(/\s+/g, " ").trim();
      const words =
        cleanText === ""
          ? 0
          : cleanText.split(" ").filter((word) => word.length > 0).length;
      setWordCount(words);
    }
  };

  const formatText = (command: string) => {
    document.execCommand(command, false, undefined);
    editorRef.current?.focus();
    setTimeout(updateWordCount, 100);
  };

  const insertLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedText = selection.toString();
      const url = prompt("Enter URL (e.g., https://www.google.com):");
      if (url) {
        let finalUrl = url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          finalUrl = "https://" + url;
        }
        const link = `<a href="${finalUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">${selectedText}</a>`;
        document.execCommand("insertHTML", false, link);
        editorRef.current?.focus();
        setTimeout(updateWordCount, 100);
      }
    } else {
      alert("Please select text first to add a link");
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(textToInsert);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editorRef.current?.focus();
      setTimeout(updateWordCount, 100);
    }
  };

  const addBulletPoint = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      insertTextAtCursor("• ");
    }
  };

  const addNumberedPoint = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      const content = editorRef.current.innerText || "";
      const numberRegex = /^(\d+)\./gm;
      let maxNumber = 0;
      let match;
      while ((match = numberRegex.exec(content)) !== null) {
        const num = Number.parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
      const nextNumber = maxNumber + 1;
      insertTextAtCursor(`${nextNumber}. `);
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "A") {
      e.preventDefault();
      const href = target.getAttribute("href");
      if (href) {
        window.open(href, "_blank");
      }
    }
    editorRef.current?.focus();
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setJobDescription(content);
      updateWordCount();
      if (errors.jobDescription) {
        setErrors((prev) => ({ ...prev, jobDescription: undefined }));
      }
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "<br><br>");
      setTimeout(updateWordCount, 100);
    }
  };

  const setEditorContent = (content: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
      setJobDescription(content);
      saveJobDescriptionToStorage(content);

      setTimeout(() => {
        updateWordCount();
        if (editorRef.current) {
          editorRef.current.style.minHeight = "140px";
          editorRef.current.focus();

          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 100);
    }
  };

  const extractJobDataFromText = (text: string) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let extractedJobTitle = "";
    const titleKeywords = [
      "job title",
      "position",
      "role",
      "vacancy",
      "opening",
    ];

    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].toLowerCase();
      const hasKeyword = titleKeywords.some((keyword) =>
        line.includes(keyword)
      );

      if (hasKeyword) {
        const colonIndex = lines[i].indexOf(":");
        if (colonIndex !== -1) {
          extractedJobTitle = lines[i].substring(colonIndex + 1).trim();
        }
        break;
      } else if (i === 0 && lines[i].length < 100) {
        extractedJobTitle = lines[i];
      }
    }

    let extractedJobDescription = "";
    const descKeywords = [
      "description",
      "responsibilities",
      "duties",
      "requirements",
      "about",
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const hasDescKeyword = descKeywords.some((keyword) =>
        line.includes(keyword)
      );

      if (hasDescKeyword && i + 1 < lines.length) {
        const descLines = lines.slice(i + 1, Math.min(i + 6, lines.length));
        if (descLines.length > 0) {
          extractedJobDescription = descLines.join("<br>");
          break;
        }
      }
    }

    if (!extractedJobDescription && text.length > 100) {
      const sentences = text
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 20);
      if (sentences.length > 0) {
        extractedJobDescription = sentences.slice(0, 3).join(". ").trim();
        if (!extractedJobDescription.endsWith(".")) {
          extractedJobDescription += ".";
        }
      }
    }

    if (!extractedJobDescription) {
      extractedJobDescription = text.substring(0, 200).trim();
      if (extractedJobDescription.length === 200) {
        extractedJobDescription += "...";
      }
    }

    const fullText = text.toLowerCase();
    let extractedRequirements = "";

    const reqKeywords = [
      "requirements",
      "skills",
      "technologies",
      "qualifications",
    ];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const hasReqKeyword = reqKeywords.some((keyword) =>
        line.includes(keyword)
      );

      if (hasReqKeyword && i + 1 < lines.length) {
        const reqLines = lines.slice(i + 1, Math.min(i + 5, lines.length));
        extractedRequirements = reqLines.join(", ").replace(/[•-]/g, "").trim();
        break;
      }
    }

    const extractedEmploymentTypes = {
      fullTime:
        fullText.includes("full-time") || fullText.includes("full time"),
      partTime:
        fullText.includes("part-time") || fullText.includes("part time"),
      onDemand:
        fullText.includes("on-demand") ||
        fullText.includes("freelance") ||
        fullText.includes("contract"),
      negotiable:
        fullText.includes("negotiable") || fullText.includes("flexible"),
    };

    const extractedSchedules: string[] = [];
    if (
      fullText.includes("day shift") ||
      fullText.includes("morning") ||
      fullText.includes("daytime")
    ) {
      extractedSchedules.push("Day shift");
    }
    if (
      fullText.includes("night shift") ||
      fullText.includes("evening") ||
      fullText.includes("nighttime")
    ) {
      extractedSchedules.push("Night shift");
    }
    if (
      fullText.includes("weekend") ||
      fullText.includes("saturday") ||
      fullText.includes("sunday")
    ) {
      extractedSchedules.push("Weekend availability");
    }

    let extractedSalaryAmount = "35,000";
    let extractedPaymentFrequency = "yearly";
    const extractedSalaryNegotiable = fullText.includes("negotiable");

    const salaryPatterns = [
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(year|yearly|annual|annually)/i,
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(month|monthly)/i,
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:per\s+)?(hour|hourly)/i,
    ];

    for (const pattern of salaryPatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedSalaryAmount = match[1];
        const frequency = match[2].toLowerCase();
        if (frequency.includes("hour")) {
          extractedPaymentFrequency = "hourly";
        } else if (frequency.includes("month")) {
          extractedPaymentFrequency = "monthly";
        } else if (frequency.includes("year") || frequency.includes("annual")) {
          extractedPaymentFrequency = "yearly";
        }
        break;
      }
    }

    const extractedHiringMultiple =
      fullText.includes("multiple") ||
      fullText.includes("several") ||
      fullText.includes("many");

    return {
      jobTitle: extractedJobTitle || "Extracted Job Position",
      jobDescription: extractedJobDescription,
      location: "Remote",
      requirements:
        extractedRequirements || "Experience with relevant technologies",
      education: "Bachelor's Degree",
      experience: "2 years",
      employmentTypes: extractedEmploymentTypes,
      selectedSchedules: extractedSchedules,
      paymentType: "custom",
      salaryAmount: extractedSalaryAmount,
      paymentFrequency: extractedPaymentFrequency,
      salaryNegotiable: extractedSalaryNegotiable,
      hiringMultiple: extractedHiringMultiple,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    };
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload PDF, DOCX, or TXT files only");
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const content = await readFileContent(file);
      const extractedJobData = extractJobDataFromText(content);
      setExtractedData(extractedJobData);
    } catch (error) {
      alert("Error reading file. Please try again.");
      setUploadedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmploymentTypeChange = (type: keyof typeof employmentTypes) => {
    setEmploymentTypes((prev) => {
      const newTypes = { ...prev, [type]: !prev[type] };
      if (errors.employmentTypes && Object.values(newTypes).some(Boolean)) {
        setErrors((prev) => ({ ...prev, employmentTypes: undefined }));
      }
      return newTypes;
    });
  };

  const handleScheduleToggle = (schedule: string) => {
    setSelectedSchedules((prev) => {
      const newSchedules = prev.includes(schedule)
        ? prev.filter((s) => s !== schedule)
        : [...prev, schedule];
      if (errors.selectedSchedules && newSchedules.length > 0) {
        setErrors((prev) => ({ ...prev, selectedSchedules: undefined }));
      }
      return newSchedules;
    });
  };

  const handleScheduleSelect = (schedule: string) => {
    if (!selectedSchedules.includes(schedule)) {
      setSelectedSchedules((prev) => {
        const newSchedules = [...prev, schedule];
        if (errors.selectedSchedules) {
          setErrors((prev) => ({ ...prev, selectedSchedules: undefined }));
        }
        return newSchedules;
      });
    }
  };

  const applyExtractedData = () => {
    if (!extractedData) return;

    setJobTitle(extractedData.jobTitle);
    setLocation(extractedData.location);
    setRequirements(extractedData.requirements);
    setEducation(extractedData.education);
    setExperience(extractedData.experience);
    setDeadline(extractedData.deadline);
    setEmploymentTypes(extractedData.employmentTypes);
    setSelectedSchedules(extractedData.selectedSchedules);
    setPaymentType(extractedData.paymentType);
    setSalaryAmount(extractedData.salaryAmount);
    setPaymentFrequency(extractedData.paymentFrequency);
    setSalaryNegotiable(extractedData.salaryNegotiable);
    setHiringMultiple(extractedData.hiringMultiple);

    setTimeout(() => {
      if (extractedData.jobDescription) {
        setEditorContent(extractedData.jobDescription);
      }
    }, 100);

    setActiveTab("manual");
    setErrors({});
  };

  const resetExtractedData = () => {
    setExtractedData(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getContractType = () => {
    const selectedTypes = Object.entries(employmentTypes)
      .filter(([_, value]) => value)
      .map(([key, _]) => {
        const labels: any = {
          fullTime: "Full-time",
          partTime: "Part-time",
          onDemand: "Contract",
          negotiable: "Negotiable",
        };
        return labels[key];
      });

    return selectedTypes[0] || "Full-time";
  };

  const prepareFormDataForAPI = () => {
    const requirementsArray = requirements
      .split(",")
      .map((req) => req.trim())
      .filter((req) => req.length > 0);

    return {
      title: jobTitle.trim(),
      description: jobDescription.replace(/<[^>]*>/g, "").trim(),
      location: location.trim(),
      requirements: requirementsArray,
      education: education.trim(),
      experience: experience.trim(),
      contract_type: getContractType(),
      deadline: deadline,
      salary: Number.parseFloat(salaryAmount.replace(/,/g, "")),
    };
  };

  const submitToFlaskAPI = async (formData: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const headers = {
      "Content-Type": "application/json",
      "X-Recruiter-ID": "3823eb09-f9f6-4bc7-a8f3-49e9aea76e1a",
      Accept: "application/json",
    };

    try {
      console.log(
        "Sending data to Flask API:",
        JSON.stringify(formData, null, 2)
      );

      const response = await fetch("http://localhost:5000/offers/create", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(formData),
        signal: controller.signal,
        mode: "cors",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", errorData);

        switch (response.status) {
          case 415:
            throw new Error(
              "Unsupported Media Type: Ensure Content-Type is application/json"
            );
          case 401:
            throw new Error("Authentication failed: Recruiter ID is missing");
          case 403:
            throw new Error(
              "Access denied: You don't have permission to create offers"
            );
          case 500:
            throw new Error("Server error: Please check all required fields");
          default:
            throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log("API Success Response:", result);
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Submission error:", error.message);

      if (error.name === "AbortError") {
        throw new Error("Request timeout: Flask server is not responding");
      }

      if (error.message.includes("fetch")) {
        throw new Error(
          "Connection failed: Make sure Flask server is running on localhost:5000 with CORS enabled"
        );
      }

      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = prepareFormDataForAPI();
      console.log("Prepared Form Data:", formData);

      const isConnected = await checkAPIConnection();

      if (isConnected) {
        const result = await submitToFlaskAPI(formData);
        setSubmitSuccess(true);
        console.log("Job offer created successfully:", result);

        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        const pendingOffer: PendingJobOffer = {
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: formData,
          timestamp: Date.now(),
          attempts: 0,
        };

        savePendingOfferToStorage(pendingOffer);

        if (!retryIntervalRef.current) {
          startRetryProcess();
        }

        setSubmitError(
          "Server is currently unavailable. Your job offer has been saved and will be submitted automatically when the server is back online."
        );

        setTimeout(() => {
          setSubmitError("");
        }, 8000);
      }
    } catch (error: any) {
      console.error("Submission error:", error);

      const formData = prepareFormDataForAPI();
      const pendingOffer: PendingJobOffer = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        data: formData,
        timestamp: Date.now(),
        attempts: 0,
      };

      savePendingOfferToStorage(pendingOffer);
      if (!retryIntervalRef.current) {
        startRetryProcess();
      }
      setSubmitError(
        "Failed to submit job offer. It has been saved locally and will be submitted automatically when the server is available."
      );

      setTimeout(() => {
        setSubmitError("");
      }, 8000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const testSampleFile = () => {
    const sampleText = `Job Title: Senior Backend Developer

Job Description:
We are looking for a skilled Senior Backend Developer to join our dynamic team. The ideal candidate will have extensive experience with Flask, PostgreSQL, and modern backend technologies.

Location: Tunis, Tunisia

Requirements:
- Flask and Python
- PostgreSQL and Supabase
- REST API development
- Git version control
- Docker containerization

Education: Bachelor's Degree in Computer Science
Experience: 3+ years in backend development

Responsibilities:
- Develop and maintain REST APIs using Flask
- Design and optimize database schemas
- Collaborate with frontend developers
- Write clean, maintainable, and well-documented code

Employment Type: Full-time
Schedule: Day shift, flexible hours
Salary: 48,000 per year
Application Deadline: 2025-12-30
Hiring: We are hiring multiple candidates for this role`;

    setIsProcessing(true);

    setTimeout(() => {
      const extractedJobData = extractJobDataFromText(sampleText);
      setExtractedData(extractedJobData);
      setUploadedFile(
        new File([sampleText], "sample-job-posting.txt", { type: "text/plain" })
      );
      setIsProcessing(false);
    }, 1000);
  };

  const isEditorEmpty = !jobDescription || jobDescription.trim() === "";

  useEffect(() => {
    if (
      editorRef.current &&
      jobDescription &&
      editorRef.current.innerHTML !== jobDescription
    ) {
      editorRef.current.innerHTML = jobDescription;
      updateWordCount();
    }
  }, [jobDescription]);

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case "jobTitle":
        setJobTitle(value);
        if (errors.jobTitle && value.trim().length >= 3) {
          setErrors((prev) => ({ ...prev, jobTitle: undefined }));
        }
        break;
      case "location":
        setLocation(value);
        if (errors.location && value.trim()) {
          setErrors((prev) => ({ ...prev, location: undefined }));
        }
        break;
      case "requirements":
        setRequirements(value);
        if (errors.requirements && value.trim()) {
          setErrors((prev) => ({ ...prev, requirements: undefined }));
        }
        break;
      case "experience":
        setExperience(value);
        if (errors.experience && value.trim()) {
          setErrors((prev) => ({ ...prev, experience: undefined }));
        }
        break;
      case "deadline":
        setDeadline(value);
        if (errors.deadline && value.trim()) {
          setErrors((prev) => ({ ...prev, deadline: undefined }));
        }
        break;
      case "salaryAmount":
        setSalaryAmount(value);
        if (errors.salaryAmount && value.trim()) {
          setErrors((prev) => ({ ...prev, salaryAmount: undefined }));
        }
        break;
    }
  };

  return (
    <div
      className="min-h-screen p-4 md:p-8 bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: 'url("/images/bg.png")' }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          {pendingOffers.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 font-medium">
                  You have {pendingOffers.length} job offer
                  {pendingOffers.length > 1 ? "s" : ""} waiting to be submitted
                  when the server is available.
                </p>
              </div>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Document
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <form onSubmit={handleSubmit}>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Job Posting Form
                  </h2>
                  <Button
                    type="button"
                    onClick={() => {
                      setJobTitle("");
                      setJobDescription("");
                      setLocation("");
                      setRequirements("");
                      setEducation("");
                      setExperience("");
                      setDeadline("");
                      setEmploymentTypes({
                        fullTime: true,
                        partTime: true,
                        onDemand: false,
                        negotiable: false,
                      });
                      setSelectedSchedules([]);
                      setSalaryAmount("35,000");
                      setSalaryNegotiable(false);
                      setHiringMultiple(false);
                      setErrors({});

                      if (editorRef.current) {
                        editorRef.current.innerHTML = "";
                      }

                      clearJobDescriptionFromStorage();

                      setWordCount(0);
                    }}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear All Data
                  </Button>
                </div>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Job title *
                      </Label>
                      <p className="text-sm text-gray-600">
                        A job title must describe one position only
                      </p>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="e.g. 'Backend Developer'"
                        value={jobTitle}
                        onChange={(e) =>
                          handleInputChange("jobTitle", e.target.value)
                        }
                        className={`w-full h-12 px-3 border rounded-md focus:ring-1 outline-none text-gray-900 ${
                          errors.jobTitle
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                      />
                      {errors.jobTitle && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.jobTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Job description *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Provide a short description about the job. Keep it short
                        and to the point.
                      </p>
                    </div>
                    <div>
                      <div
                        className={`border rounded-md ${
                          errors.jobDescription
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-gray-200 p-3 bg-gray-50">
                          <div className="flex items-center space-x-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={() => formatText("bold")}
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={() => formatText("italic")}
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={() => formatText("underline")}
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={() => formatText("strikeThrough")}
                            >
                              <Strikethrough className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={insertLink}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={addBulletPoint}
                            >
                              <List className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={addNumberedPoint}
                            >
                              <ListOrdered className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-200 text-red-600"
                              onClick={() => {
                                if (editorRef.current) {
                                  editorRef.current.innerHTML = "";
                                  setJobDescription("");
                                  clearJobDescriptionFromStorage();
                                  updateWordCount();
                                }
                              }}
                              title="Clear description"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {wordCount} words
                            </span>
                            {jobDescription && (
                              <span className="text-xs text-green-600">
                                Saved
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <div
                            key={jobDescription ? "has-content" : "empty"}
                            ref={editorRef}
                            contentEditable
                            className="min-h-[140px] p-3 focus:outline-none text-gray-900"
                            style={{ lineHeight: "1.5" }}
                            onInput={handleEditorInput}
                            onKeyDown={handleEditorKeyDown}
                            onClick={handleEditorClick}
                            suppressContentEditableWarning={true}
                          />
                          {isEditorEmpty && (
                            <div className="absolute left-3 top-3 text-gray-400 pointer-events-none select-none">
                              Description
                            </div>
                          )}
                        </div>
                      </div>
                      {errors.jobDescription && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.jobDescription}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Location *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Where will this job be located?
                      </p>
                    </div>
                    <div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="e.g. 'Tunis, Tunisia' or 'Remote'"
                          value={location}
                          onChange={(e) =>
                            handleInputChange("location", e.target.value)
                          }
                          className={`w-full h-12 pl-10 pr-3 border rounded-md focus:ring-1 outline-none text-gray-900 ${
                            errors.location
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                      </div>
                      {errors.location && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.location}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Requirements *
                      </Label>
                      <p className="text-sm text-gray-600">
                        List the skills and technologies required, separated by
                        commas
                      </p>
                    </div>
                    <div>
                      <textarea
                        placeholder="e.g. Flask, PostgreSQL, Python, REST APIs, Git"
                        value={requirements}
                        onChange={(e) =>
                          handleInputChange("requirements", e.target.value)
                        }
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-1 outline-none text-gray-900 resize-none ${
                          errors.requirements
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                      />
                      {errors.requirements && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.requirements}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Education *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Required education level
                      </p>
                    </div>
                    <div>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Select
                          value={education}
                          onValueChange={(value) => {
                            setEducation(value);
                            if (errors.education) {
                              setErrors((prev) => ({
                                ...prev,
                                education: undefined,
                              }));
                            }
                          }}
                        >
                          <SelectTrigger
                            className={`w-full h-12 custom-select pl-10 ${
                              errors.education
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-300 focus:border-blue-500"
                            }`}
                          >
                            <SelectValue placeholder="Select education level" />
                            <ChevronDown className="h-6 w-6 custom-chevron text-blue-600" />
                          </SelectTrigger>
                          <SelectContent>
                            {educationOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.education && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.education}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Experience *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Required years of experience
                      </p>
                    </div>
                    <div>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="e.g. '2 years' or 'Entry level'"
                          value={experience}
                          onChange={(e) =>
                            handleInputChange("experience", e.target.value)
                          }
                          className={`w-full h-12 pl-10 pr-3 border rounded-md focus:ring-1 outline-none text-gray-900 ${
                            errors.experience
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                      </div>
                      {errors.experience && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.experience}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Application Deadline *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Last date to apply for this position
                      </p>
                    </div>
                    <div>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) =>
                            handleInputChange("deadline", e.target.value)
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className={`w-full h-12 pl-10 pr-3 border rounded-md focus:ring-1 outline-none text-gray-900 ${
                            errors.deadline
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          }`}
                        />
                      </div>
                      {errors.deadline && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.deadline}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Employment type *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Select at least one employment type
                      </p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: "fullTime", label: "Full-time" },
                        { key: "partTime", label: "Part-time" },
                        { key: "onDemand", label: "Contract" },
                        { key: "negotiable", label: "Negotiable" },
                      ].map(({ key, label }) => (
                        <div
                          key={key}
                          className={`flex items-center space-x-3 p-4 border rounded-md transition-colors ${
                            employmentTypes[key as keyof typeof employmentTypes]
                              ? "border-blue-600"
                              : errors.employmentTypes
                              ? "border-red-500 hover:border-red-400"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Checkbox
                            id={key}
                            checked={
                              employmentTypes[
                                key as keyof typeof employmentTypes
                              ]
                            }
                            onCheckedChange={() =>
                              handleEmploymentTypeChange(
                                key as keyof typeof employmentTypes
                              )
                            }
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label
                            htmlFor={key}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {label}
                          </Label>
                        </div>
                      ))}
                      {errors.employmentTypes && (
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.employmentTypes}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Working schedule *
                      </Label>
                      <p className="text-sm text-gray-600">
                        You can pick multiple work schedules.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <Select onValueChange={handleScheduleSelect}>
                        <SelectTrigger
                          className={`w-full h-12 custom-select focus:ring-blue-500 text-gray-500 ${
                            errors.selectedSchedules
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-300 focus:border-blue-500"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Pick working schedule</span>
                          </div>
                          <ChevronDown className="h-6 w-6 custom-chevron text-blue-600" />
                        </SelectTrigger>
                        <SelectContent>
                          {scheduleOptions.map((schedule) => (
                            <SelectItem key={schedule} value={schedule}>
                              {schedule}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex flex-wrap gap-2">
                        {scheduleOptions.map((schedule) => (
                          <Badge
                            key={schedule}
                            variant={
                              selectedSchedules.includes(schedule)
                                ? "default"
                                : "outline"
                            }
                            className={`cursor-pointer px-3 py-1 text-sm transition-colors flex items-center gap-1 ${
                              selectedSchedules.includes(schedule)
                                ? "bg-[#eef6fe] text-gray-800 font-light hover:bg-blue-200"
                                : "bg-[#d4dce3] text-gray-800 font-light hover:bg-blue-300"
                            }`}
                            onClick={() => handleScheduleToggle(schedule)}
                          >
                            {selectedSchedules.includes(schedule) && (
                              <Check className="h-3 w-3 text-green-600" />
                            )}
                            {schedule}
                          </Badge>
                        ))}
                      </div>

                      {errors.selectedSchedules && (
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          {errors.selectedSchedules}
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Salary *
                      </Label>
                      <p className="text-sm text-gray-600">
                        Annual salary amount
                      </p>
                    </div>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div
                          className={`cursor-pointer border-2 p-4 text-center transition-all bg-inherit ${
                            paymentType === "hourly"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                          onClick={() => setPaymentType("hourly")}
                        >
                          <div className="flex items-center mb-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                paymentType === "hourly"
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {paymentType === "hourly" && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                          </div>
                          <Clock className="mx-auto h-6 w-6 text-blue-600 mb-2" />
                          <p
                            className={`font-medium ${
                              paymentType === "custom"
                                ? " text-black"
                                : "text-blue-600"
                            }`}
                          >
                            Hourly
                          </p>
                        </div>
                        <div
                          className={`cursor-pointer border-2 p-4 text-center transition-all bg-inherit ${
                            paymentType === "custom"
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                          onClick={() => setPaymentType("custom")}
                        >
                          <div className="flex items-center mb-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                paymentType === "custom"
                                  ? "border-blue-500 bg-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {paymentType === "custom" && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                          </div>
                          <svg
                            className="mx-auto h-8 w-8 text-gray-600 mb-2"
                            xmlns="http://www.w3.org/2000/svg"
                            width={24}
                            height={24}
                            fill="none"
                            stroke="#2E6AD4"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            viewBox="0 0 24 24"
                          >
                            <rect
                              x={3}
                              y={7}
                              width={18}
                              height={10}
                              rx={2}
                              ry={2}
                              stroke="#2E6AD4"
                              fill="none"
                            />
                            <circle cx={12} cy={12} r={2} fill="#2E6AD4" />
                            <circle cx={7} cy={12} r={1} fill="#2E6AD4" />
                            <circle cx={17} cy={12} r={1} fill="#2E6AD4" />
                          </svg>

                          <p
                            className={`font-medium ${
                              paymentType === "custom"
                                ? "text-blue-600"
                                : " text-black"
                            }`}
                          >
                            Custom
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Amount you want to pay
                          </Label>
                          <input
                            type="text"
                            value={salaryAmount}
                            onChange={(e) =>
                              handleInputChange("salaryAmount", e.target.value)
                            }
                            className={`w-full h-12 px-3 border rounded-md focus:ring-1 outline-none ${
                              errors.salaryAmount
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                          />
                          {errors.salaryAmount && (
                            <div className="flex items-center gap-1 text-red-600 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              {errors.salaryAmount}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            How you want to pay
                          </Label>
                          <Select
                            value={paymentFrequency}
                            onValueChange={setPaymentFrequency}
                          >
                            <SelectTrigger className="h-12 border-gray-300 custom-select focus:border-blue-500 focus:ring-blue-500">
                              <SelectValue />
                              <ChevronDown className="h-6 w-6 custom-chevron text-blue-600" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="salary-negotiable"
                          checked={salaryNegotiable}
                          onCheckedChange={(checked) =>
                            setSalaryNegotiable(checked === true)
                          }
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label
                          htmlFor="salary-negotiable"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Salary is negotiable
                        </Label>
                      </div>
                    </div>
                  </div>

                  <hr />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div>
                      <Label className="text-lg font-semibold text-gray-900 block mb-2">
                        Hiring multiple candidates?
                      </Label>
                      <p className="text-sm text-gray-600">
                        This will be displayed on job page for candidates to
                        see.
                      </p>
                    </div>
                    <div className="flex items-center space-x-3 border border-gray-300 p-3">
                      <Checkbox
                        id="hiring-multiple"
                        checked={hiringMultiple}
                        onCheckedChange={(checked) =>
                          setHiringMultiple(checked === true)
                        }
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label
                        htmlFor="hiring-multiple"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Yes, I am hiring multiple candidates
                      </Label>
                    </div>
                  </div>

                  <div className="flex flex-col items-end pt-6">
                    {submitSuccess && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md w-full">
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-600 mr-2" />
                          <p className="text-green-800 font-medium">
                            Job offer created successfully!
                          </p>
                        </div>
                      </div>
                    )}

                    {submitError && (
                      <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md w-full">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-orange-600 mr-2" />
                          <p className="text-orange-800 font-medium">
                            {submitError}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 px-8 py-2 disabled:opacity-50"
                    >
                      {isSubmitting ? "Creating Offer..." : "Create Job Offer"}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="import">
              <div className="space-y-6">
                {!extractedData ? (
                  <Card>
                    <CardContent className="p-8">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Upload Job Document
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                          Upload a TXT file for best results. PDF and DOCX
                          support is limited.
                        </p>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessing}
                          className="bg-blue-600 hover:bg-blue-700 mr-4"
                        >
                          {isProcessing ? "Processing..." : "Choose File"}
                        </Button>

                        <Button
                          type="button"
                          onClick={testSampleFile}
                          disabled={isProcessing}
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          Test Sample File
                        </Button>

                        {uploadedFile && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">
                              Uploaded file: {uploadedFile.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Extracted Data from Document
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              onClick={applyExtractedData}
                              className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                            >
                              <Check className="h-4 w-4" />
                              Apply Data
                            </Button>
                            <Button
                              onClick={resetExtractedData}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4 text-sm">
                          <div>
                            <strong>Job Title:</strong> {extractedData.jobTitle}
                          </div>
                          <div>
                            <strong>Job Description:</strong>{" "}
                            {extractedData.jobDescription}
                          </div>
                          <div>
                            <strong>Location:</strong> {extractedData.location}
                          </div>
                          <div>
                            <strong>Requirements:</strong>{" "}
                            {extractedData.requirements}
                          </div>
                          <div>
                            <strong>Education:</strong>{" "}
                            {extractedData.education}
                          </div>
                          <div>
                            <strong>Experience:</strong>{" "}
                            {extractedData.experience}
                          </div>
                          <div>
                            <strong>Employment Type:</strong>{" "}
                            {Object.entries(extractedData.employmentTypes)
                              .filter(([_, value]) => value)
                              .map(([key, _]) => {
                                const labels: any = {
                                  fullTime: "Full-time",
                                  partTime: "Part-time",
                                  onDemand: "Contract",
                                  negotiable: "Negotiable",
                                };
                                return labels[key];
                              })
                              .join(", ")}
                          </div>
                          <div>
                            <strong>Working Schedule:</strong>{" "}
                            {extractedData.selectedSchedules.join(", ") ||
                              "None detected"}
                          </div>
                          <div>
                            <strong>Salary:</strong>{" "}
                            {extractedData.salaryAmount}
                            {extractedData.salaryNegotiable && " - Negotiable"}
                          </div>
                          <div>
                            <strong>Deadline:</strong> {extractedData.deadline}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
