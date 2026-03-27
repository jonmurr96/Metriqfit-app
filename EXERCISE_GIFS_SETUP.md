# Exercise GIFs Setup Guide

## Overview

MetriqFit now supports 1,323 exercise animation GIFs from the [exercises-gifs repository](https://github.com/omercotkd/exercises-gifs). Due to the large size (~370MB), these GIFs are not stored in the git repository and must be downloaded separately.

## Quick Setup

### Option 1: Automated Script (Recommended)

```bash
# Run the download script
./scripts/download-exercise-gifs.sh
```

This will:
1. Clone the exercises-gifs repository (shallow clone)
2. Copy all 1,323 GIF files to `assets/exercises/`
3. Copy the exercises metadata CSV
4. Clean up temporary files

### Option 2: Manual Download

```bash
# Clone the repository
git clone --depth 1 https://github.com/omercotkd/exercises-gifs.git temp-exercises-gifs

# Create assets directory
mkdir -p assets/exercises

# Copy files
cp temp-exercises-gifs/assets/*.gif assets/exercises/
cp temp-exercises-gifs/exercises.csv assets/exercises/

# Clean up
rm -rf temp-exercises-gifs
```

## Usage in Code

### 1. Import the GIF Mapper Utility

```typescript
import {
  getExerciseGifByName,
  getExerciseGifPath,
  getGifIdByExerciseName
} from '@/utils/exerciseGifMapper';
```

### 2. Get GIF Path for an Exercise

```typescript
// By exercise name
const gifPath = getExerciseGifByName('Barbell Bench Press');
// Returns: '/assets/exercises/0033.gif'

// By GIF ID directly
const gifPath2 = getExerciseGifPath('0033');
// Returns: '/assets/exercises/0033.gif'

// Get just the GIF ID
const gifId = getGifIdByExerciseName('Barbell Bench Press');
// Returns: '0033'
```

### 3. Display in React Native Component

```tsx
import { Image } from 'react-native';
import { getExerciseGifByName } from '@/utils/exerciseGifMapper';

export function ExerciseAnimation({ exerciseName }: { exerciseName: string }) {
  const gifPath = getExerciseGifByName(exerciseName);

  if (!gifPath) {
    return (
      <View style={styles.placeholder}>
        <Text>No animation available</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: gifPath }}
      style={styles.animation}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  animation: {
    width: 300,
    height: 300,
  },
  placeholder: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});
```

### 4. Integrate with Exercise Media System

The existing `lib/workout/exercise-media.ts` system can be extended:

```typescript
import { getExerciseGifByName } from '@/utils/exerciseGifMapper';
import type { ExerciseMediaSource } from '@/lib/workout/exercise-media';

export function getExerciseMediaWithLocalGif(
  exerciseName: string,
  existingMedia?: ExerciseMediaSource
): ExerciseMediaSource {
  const localGifPath = getExerciseGifByName(exerciseName);

  return {
    ...existingMedia,
    gifUrl: existingMedia?.gifUrl || localGifPath,
    hasMedia: !!(existingMedia?.gifUrl || localGifPath),
  };
}
```

## Database Integration

### Update Exercise Records with GIF URLs

You can update the exercises table to reference local GIFs:

```typescript
import { supabase } from '@/lib/supabase';
import { getGifIdByExerciseName } from '@/utils/exerciseGifMapper';

async function updateExerciseWithGif(exerciseName: string) {
  const gifId = getGifIdByExerciseName(exerciseName);

  if (!gifId) {
    console.log(`No GIF mapping for: ${exerciseName}`);
    return;
  }

  const gifUrl = `/assets/exercises/${gifId}.gif`;

  await supabase
    .from('exercises')
    .update({ gif_url: gifUrl })
    .eq('name', exerciseName);

  console.log(`Updated ${exerciseName} with GIF: ${gifUrl}`);
}
```

### Bulk Update Script

Create a script to update all mapped exercises:

```typescript
import { EXERCISE_NAME_TO_GIF_ID } from '@/utils/exerciseGifMapper';

async function bulkUpdateExerciseGifs() {
  const updates = Object.entries(EXERCISE_NAME_TO_GIF_ID).map(
    ([exerciseName, gifId]) => ({
      name: exerciseName,
      gif_url: `/assets/exercises/${gifId}.gif`,
    })
  );

  for (const update of updates) {
    await supabase
      .from('exercises')
      .update({ gif_url: update.gif_url })
      .eq('name', update.name);
  }

  console.log(`Updated ${updates.length} exercises with GIF URLs`);
}
```

## Expanding the Exercise Mappings

The `utils/exerciseGifMapper.ts` file contains a partial mapping. To add more:

1. **Find the exercise in `assets/exercises/exercises.csv`:**
   ```csv
   id,name,bodyPart,equipment,target,...
   0033,barbell bench press,chest,barbell,pectorals,...
   ```

2. **Add to `EXERCISE_NAME_TO_GIF_ID` mapping:**
   ```typescript
   export const EXERCISE_NAME_TO_GIF_ID: Record<string, string> = {
     // ... existing mappings
     'Barbell Bench Press': '0033',  // Match the ID from CSV
   };
   ```

3. **Test the mapping:**
   ```typescript
   const gifPath = getExerciseGifByName('Barbell Bench Press');
   console.log(gifPath); // Should return: '/assets/exercises/0033.gif'
   ```

## File Structure

```
assets/exercises/
├── 0001.gif              # 3/4 sit-up
├── 0002.gif              # 45° side bend
├── ...
├── 3360.gif              # Last exercise
├── exercises.csv         # Metadata (tracked in git)
└── README.md            # Documentation (tracked in git)

utils/
└── exerciseGifMapper.ts  # Mapping utility (tracked in git)

scripts/
└── download-exercise-gifs.sh  # Download script (tracked in git)

supabase/migrations/
└── 042_add_exercise_gif_support.sql  # Migration (tracked in git)
```

## Performance Optimization

### For Web

```typescript
// Lazy load GIFs
import { useState, useEffect } from 'react';

export function LazyExerciseGif({ gifPath }: { gifPath: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={gifPath}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
    />
  );
}
```

### For Mobile

```typescript
// Use FastImage for better performance (install: expo install react-native-fast-image)
import FastImage from 'react-native-fast-image';

export function OptimizedExerciseGif({ gifPath }: { gifPath: string }) {
  return (
    <FastImage
      source={{ uri: gifPath, priority: FastImage.priority.normal }}
      style={{ width: 300, height: 300 }}
      resizeMode={FastImage.resizeMode.contain}
    />
  );
}
```

## Troubleshooting

### GIFs not found after setup

```bash
# Verify GIFs are downloaded
ls -l assets/exercises/*.gif | wc -l
# Should show: 1323

# Re-run download script
./scripts/download-exercise-gifs.sh
```

### Mapping not working

```typescript
// Check if exercise name exists in mapping
import { EXERCISE_NAME_TO_GIF_ID } from '@/utils/exerciseGifMapper';

console.log(EXERCISE_NAME_TO_GIF_ID['Barbell Bench Press']);
// Should return: '0033'
```

### GIF not displaying in app

1. Verify the GIF file exists:
   ```bash
   ls assets/exercises/0033.gif
   ```

2. Check the path format matches your platform (web vs native)

3. Ensure the Image component supports GIF format

## Next Steps

1. **Run the setup script** to download GIFs
2. **Expand exercise mappings** in `exerciseGifMapper.ts`
3. **Update database** with GIF URLs for exercises
4. **Integrate into UI** components for exercise displays
5. **Optimize performance** with lazy loading or CDN

## Resources

- [Exercise GIFs Repository](https://github.com/omercotkd/exercises-gifs)
- [Original Kaggle Dataset](https://www.kaggle.com/datasets/edoardoba/fitness-exercises-with-animations)
- [Exercise Metadata CSV](assets/exercises/exercises.csv)
- [Utility Documentation](utils/exerciseGifMapper.ts)

## License & Attribution

All exercise animations are from the original Kaggle dataset. The exercises-gifs repository serves as a backup host. All rights belong to the original creators and dataset owner.
