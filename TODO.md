# AI Resume Analyser - Known Issues & TODO

## 🔴 CRITICAL ISSUES

### 1. **AI Feedback Response Parsing Error** (STUCK ON ANALYZING)
**File:** [app/routes/upload.tsx](app/routes/upload.tsx#L59-L61)

**Problem:** 
- The code assumes `feedback.message.content` is either a string OR an array
- However, the AI response structure might be different
- When `feedback.message.content[0].text` is accessed, it may be undefined
- Also, `JSON.parse()` can fail if the AI returns markdown code blocks like \`\`\`json

**Symptoms:**
- App gets stuck on "Analyzing..." status
- No error shown to user
- Console may show parsing errors

**Fix Required:**
```typescript
// Add better error handling and response validation
try {
  const feedback = await ai.feedback(
    uploadedFile.path,
    prepareInstructions({jobTitle, jobDescription})
  )
  
  if (!feedback) {
    setIsProcessing(false)
    return setStatusText('Failed to analyze resume. Please try again.')
  }

  console.log('Raw AI Response:', feedback) // Debug log
  
  // Handle different response formats
  let feedbackText = ''
  if (typeof feedback.message.content === 'string') {
    feedbackText = feedback.message.content
  } else if (Array.isArray(feedback.message.content)) {
    feedbackText = feedback.message.content[0]?.text || ''
  }
  
  if (!feedbackText) {
    setIsProcessing(false)
    return setStatusText('Invalid AI response format.')
  }

  // Remove markdown code blocks if present
  feedbackText = feedbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  
  // Parse and validate JSON
  const parsedFeedback = JSON.parse(feedbackText)
  
  // Validate the structure matches expected format
  if (!parsedFeedback.overallScore || !parsedFeedback.ATS) {
    throw new Error('Invalid feedback structure')
  }
  
  data.feedback = parsedFeedback
  
} catch (err) {
  console.error('Feedback parsing error:', err)
  setIsProcessing(false)
  return setStatusText('Failed to parse AI feedback. Please try again.')
}
```

---

## 🟡 HIGH PRIORITY ISSUES

### 2. **Error State Not Reset on Failures**
**File:** [app/routes/upload.tsx](app/routes/upload.tsx#L29-L65)

**Problem:**
- When any step fails (upload, convert, analyze), `isProcessing` stays `true`
- UI remains stuck showing error message with loading GIF
- User cannot retry without page refresh

**Fix Required:**
- Add `setIsProcessing(false)` before all early returns in `handleAnalyze`
- Wrap entire function in try-catch
```typescript
const handleAnalyze = async ({...}) => {
  try {
    setIsProcessing(true)
    // ... existing code
  } catch (err) {
    console.error('Analysis error:', err)
    setIsProcessing(false)
    setStatusText(`Error: ${err.message}`)
  }
}
```

---

### 3. **Form Validation Missing**
**File:** [app/routes/upload.tsx](app/routes/upload.tsx#L77-L88)

**Problem:**
- Form can be submitted with empty fields
- No file validation before submission
- No user feedback for invalid input

**Fix Required:**
```typescript
const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const form = e.currentTarget
  if (!form) return

  const formData = new FormData(form)
  const companyName = formData.get('company-name') as string
  const jobTitle = formData.get('job-title') as string
  const jobDescription = formData.get('job-description') as string

  // Validation
  if (!companyName?.trim()) {
    setStatusText('Please enter company name')
    return
  }
  if (!jobTitle?.trim()) {
    setStatusText('Please enter job title')
    return
  }
  if (!jobDescription?.trim()) {
    setStatusText('Please enter job description')
    return
  }
  if (!file) {
    setStatusText('Please upload a resume PDF')
    return
  }

  handleAnalyze({companyName, jobTitle, jobDescription, file})
}
```

---

### 4. **Home Page Shows Hardcoded Resumes**
**File:** [app/routes/home.tsx](app/routes/home.tsx#L20-L25)

**Problem:**
- Using dummy data from constants instead of real data
- User's analyzed resumes don't appear on home page
- No integration with KV store

**Fix Required:**
```typescript
const [resumes, setResumes] = useState<Resume[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const loadResumes = async () => {
    if (!auth.isAuthenticated) return
    
    try {
      const keys = await kv.list('resume:*', true)
      const resumeData = keys
        .map(item => {
          try {
            return JSON.parse(item.value)
          } catch {
            return null
          }
        })
        .filter(Boolean)
      
      setResumes(resumeData)
    } catch (err) {
      console.error('Failed to load resumes:', err)
    } finally {
      setLoading(false)
    }
  }
  
  loadResumes()
}, [auth.isAuthenticated])
```

---

## 🟢 MINOR ISSUES / IMPROVEMENTS

### 5. **FileUploader Remove Button Event Propagation**
**File:** [app/components/FileUploader.tsx](app/components/FileUploader.tsx#L46)

**Problem:**
- Remove button click might trigger file upload dialog
- Event propagation not fully prevented

**Fix Required:**
```typescript
<button 
  className="p-2 cursor-pointer" 
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
    onFileSelect?.(null)
  }}
>
  <img src="/icons/cross.svg" alt="remove" className="w-4 h-4" />
</button>
```

---

### 6. **Chrome DevTools Route Error** (LOW PRIORITY)
**Error:** `No route matches URL "/.well-known/appspecific/com.chrome.devtools.json"`

**Problem:**
- Chrome DevTools tries to fetch this file for debugging features
- Not a real bug, just missing route causes console noise

**Fix Required (Optional):**
Add a catch-all route in [react-router.config.ts](react-router.config.ts) or ignore this error:
```typescript
// In routes.ts, add at the end:
{
  path: '/.well-known/*',
  async loader() {
    return new Response('Not Found', { status: 404 })
  }
}
```

---

## 📋 ADDITIONAL IMPROVEMENTS

### 7. Add Loading States
- Add skeleton loaders for resume cards
- Show better loading indicators during file upload

### 8. Add Toast Notifications
- Replace status text with proper toast notifications
- Better UX for success/error messages

### 9. Add Resume Detail Page
- Need to create `/resume/:id` route to show analysis results
- Missing route referenced in line 72 of upload.tsx

### 10. Add Error Boundaries
- Wrap components in error boundaries
- Prevent full app crashes from component errors

### 11. Add Retry Logic
- Allow users to retry failed operations
- Add "Try Again" button when errors occur

---

## ✅ FIXED ISSUES

### ✓ PDF to Image Conversion
**Status:** FIXED
**File:** [app/lib/pdf2img.ts](app/lib/pdf2img.ts)
**Solution:** Updated to use dynamic worker imports matching pdfjs-dist version
