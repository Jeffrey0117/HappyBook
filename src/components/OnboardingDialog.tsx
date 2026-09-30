import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'

interface OnboardingDialogProps {
  open: boolean
  onComplete: (data: { contact_type: 'ig' | 'line'; contact_id: string; city: string }) => Promise<void>
}

const OnboardingDialog = ({ open, onComplete }: OnboardingDialogProps) => {
  const [contactType, setContactType] = useState<'ig' | 'line'>('ig')
  const [contactId, setContactId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!contactId.trim()) return
    setSaving(true)
    try {
      await onComplete({
        contact_type: contactType,
        contact_id: contactId.trim(),
        city: '台中',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>歡迎加入換書不可！</DialogTitle>
          <DialogDescription>
            請先填寫聯絡方式，讓換書夥伴找到你
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <div className="space-y-3">
            <Label className="text-base font-medium">聯絡方式</Label>
            <RadioGroup
              value={contactType}
              onValueChange={(v) => setContactType(v as 'ig' | 'line')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ig" id="ig" />
                <Label htmlFor="ig" className="cursor-pointer">Instagram</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="line" id="line" />
                <Label htmlFor="line" className="cursor-pointer">LINE</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-id">
              {contactType === 'ig' ? 'IG 帳號' : 'LINE ID'}
            </Label>
            <Input
              id="contact-id"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder={contactType === 'ig' ? '@your_ig_handle' : 'your_line_id'}
            />
          </div>

          <div className="space-y-2">
            <Label>地區</Label>
            <Input value="台中" disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">目前僅開放台中地區</p>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!contactId.trim() || saving}
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />儲存中...</>
            ) : (
              '開始換書'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OnboardingDialog
