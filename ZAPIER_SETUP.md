# Zapier Integration Guide

Connect your Resolution Tracker to Zapier for automated reminders and notifications!

---

## ⚡ One-Click Templates (Easiest)

The easiest way to set up Zapier is through the app:

1. **Go to the Zapier tab** in your Resolution Tracker app
2. **Connect your Notion database** (one-time setup):
   - Open your Notion Resolution Tracker database
   - Click the "..." menu in the top right
   - Click "Add connections"
   - Select "Resolution Tracker" integration
3. **Click "Create This Zap"** on any workflow template
4. Zapier will open with pre-configured steps
5. Follow the prompts to connect your accounts
6. Turn on your Zap!

Available templates:
- 📱 **Daily Check-in Reminder** - Get reminded if you haven't updated today
- 🎉 **Milestone Celebrations** - Celebrate when you hit 25/50/75/100%
- 📊 **Weekly Progress Report** - Get a summary email every Sunday
- 🔥 **Streak Protection Alert** - Don't lose your streaks
- 🤝 **Accountability Partner** - Share progress with a friend

---

## 🚀 Manual Setup Instructions

Prefer to set up Zaps manually? Here's how:

### 1. Daily Check-in Reminder (SMS/Email)

**Goal**: Send a reminder every day at 6 PM if you haven't checked in.

**Setup**:
1. Go to [zapier.com](https://zapier.com)
2. Click **"Create Zap"**
3. **Trigger**: Schedule by Zapier
   - Event: Every Day
   - Time: 6:00 PM
4. **Action**: Notion → Find Database Item
   - Database: Your Resolution Tracker database
   - Filter: `Last Check-in` is not today
5. **Action**: SMS by Zapier (or Gmail)
   - To: Your phone number
   - Message: "Don't forget to update your resolutions today! 🎯"

---

### 2. Milestone Celebrations

**Goal**: Get notified when you reach 25%, 50%, 75%, or 100% of any goal.

**Setup**:
1. **Trigger**: Notion → Updated Database Item
   - Database: Your Resolution Tracker database
   - Watch for: Updates to any item
2. **Action**: Code by Zapier (JavaScript)
   ```javascript
   const current = inputData.current_progress;
   const target = inputData.target;
   const progress = (current / target) * 100;

   const milestones = [25, 50, 75, 100];
   const milestone = milestones.find(m => Math.abs(progress - m) < 0.1);

   if (milestone) {
     output = {
       celebrate: true,
       milestone: milestone,
       title: inputData.title
     };
   } else {
     output = { celebrate: false };
   }
   ```
3. **Filter**: Only continue if `celebrate` is true
4. **Action**: Send notification
   - Slack: Post message "🎉 Milestone! You're ${milestone}% done with ${title}!"
   - Email: Send celebration email
   - SMS: Text yourself

---

### 3. Weekly Progress Report

**Goal**: Get a summary email every Sunday with your progress.

**Setup**:
1. **Trigger**: Schedule by Zapier
   - Event: Every Week
   - Day: Sunday
   - Time: 8:00 AM
2. **Action**: Notion → Find Database Items
   - Database: Your Resolution Tracker database
   - Return all items
3. **Action**: Code by Zapier
   ```javascript
   const resolutions = inputData.results;

   let report = "📊 Weekly Resolution Report\n\n";

   resolutions.forEach(r => {
     const progress = ((r.current / r.target) * 100).toFixed(0);
     report += `${r.title}: ${progress}% (${r.current}/${r.target} ${r.unit})\n`;
   });

   output = { report: report };
   ```
4. **Action**: Gmail → Send Email
   - To: Your email
   - Subject: "Your Weekly Resolution Report"
   - Body: Use `report` from previous step

---

### 4. Streak Alerts

**Goal**: Get notified when you're about to lose a streak.

**Setup**:
1. **Trigger**: Schedule by Zapier
   - Event: Every Day
   - Time: 8:00 PM
2. **Action**: Notion → Find Database Items
   - Database: Your Resolution Tracker database
   - Filter: `Streak` > 0 AND `Last Check-in` is not today
3. **Action**: SMS/Email
   - Message: "⚠️ Don't lose your ${streak} day streak on ${title}! Update now."

---

### 5. Accountability Partner Updates

**Goal**: Share your progress with a friend or accountability partner.

**Setup**:
1. **Trigger**: Notion → Updated Database Item
   - Database: Your Resolution Tracker database
2. **Filter**: Only continue if significant change (e.g., progress increased by 10%+)
3. **Action**: Email or SMS
   - To: Your accountability partner
   - Message: "Just made progress! ${title}: ${current}/${target} ${unit} (${progress}%)"

---

## 📱 SMS Reminders with Twilio

For SMS, you'll need a Twilio account (free trial available):

1. Sign up at [twilio.com](https://www.twilio.com/)
2. Get your phone number
3. In Zapier, use "SMS by Zapier" or "Twilio" action
4. Format:
   ```
   🎯 Resolution Check-in!

   ${resolution_title}
   Current: ${current}/${target} ${unit}
   Progress: ${progress}%

   Update at: https://res-tracker.vercel.app
   ```

---

## 📧 Email Templates

### Daily Reminder Email
```
Subject: Time to Update Your Resolutions! 🎯

Hi there!

You haven't checked in on your resolutions today. Here's what you're working on:

[List of active resolutions]

Take 2 minutes to update your progress:
👉 https://res-tracker.vercel.app

Keep crushing your goals!
```

### Milestone Celebration Email
```
Subject: 🎉 Milestone Reached!

Congratulations!

You just hit ${milestone}% on "${resolution_title}"!

Current Progress: ${current}/${target} ${unit}

Keep up the amazing work!
```

---

## 🔗 Notion Webhooks (Advanced)

For real-time updates, you can add webhooks to your app. Let me know if you want to add this feature!

**Benefits**:
- Instant notifications (not polling-based)
- Can trigger custom logic
- Lower Zapier task usage

---

## 🛠️ Troubleshooting

### Zap not triggering?
- Check that your Notion database is shared with Zapier integration
- Verify the database ID matches
- Test the Zap manually first

### Can't find your database?
- Make sure you connected Notion to Zapier
- Go to notion.so/my-integrations and create "Zapier" integration
- Share your database with the Zapier integration

### Need help?
Check the Zapier tab in your app for more workflow ideas!

---

## 📚 Resources

- [Zapier Notion Integration](https://zapier.com/apps/notion/integrations)
- [Twilio SMS Setup](https://www.twilio.com/docs/sms/quickstart)
- [Zapier Code Examples](https://zapier.com/help/create/code-webhooks/use-javascript-code-in-zaps)
