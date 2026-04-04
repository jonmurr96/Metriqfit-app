# Exercise Animation GIFs

This directory contains 1,323 exercise animation GIFs sourced from the [exercises-gifs](https://github.com/omercotkd/exercises-gifs) repository.

## Source

- **Repository**: https://github.com/omercotkd/exercises-gifs
- **Original Dataset**: Fitness Exercises with Animations (Kaggle)
- **License**: See LICENSE file in repository
- **Total GIFs**: 1,323 exercises

## File Structure

```
assets/exercises/
├── 0001.gif          # 3/4 sit-up
├── 0002.gif          # 45° side bend
├── 0003.gif          # air bike
├── ...
├── 3360.gif          # last exercise
└── exercises.csv     # Metadata for all exercises
```

## CSV Format

The `exercises.csv` file contains metadata for each exercise:

| Column | Description |
|--------|-------------|
| `id` | Numeric ID (matches GIF filename) |
| `name` | Exercise name |
| `bodyPart` | Body part targeted |
| `equipment` | Equipment required |
| `target` | Primary target muscle |
| `secondaryMuscles/*` | Secondary muscles involved |
| `instructions/*` | Step-by-step instructions |

## Usage in MetriqFit

### Using the GIF Mapper Utility

```typescript
import { getExerciseGifByName, getExerciseGifPath } from '@/utils/exerciseGifMapper';

// Get GIF path by exercise name
const gifPath = getExerciseGifByName('Barbell Bench Press');
// Returns: '/assets/exercises/0033.gif'

// Get GIF path by ID directly
const gifPath2 = getExerciseGifPath('0033');
// Returns: '/assets/exercises/0033.gif'
```

### Displaying in React Native

```tsx
import { Image } from 'react-native';
import { getExerciseGifByName } from '@/utils/exerciseGifMapper';

export function ExerciseAnimation({ exerciseName }: { exerciseName: string }) {
  const gifPath = getExerciseGifByName(exerciseName);

  if (!gifPath) {
    return <Text>No animation available</Text>;
  }

  return (
    <Image
      source={{ uri: gifPath }}
      style={{ width: 300, height: 300 }}
      resizeMode="contain"
    />
  );
}
```

## Mapping MetriqFit Exercises

The `utils/exerciseGifMapper.ts` file contains a mapping between MetriqFit exercise names and GIF IDs. This mapping is currently partial and can be expanded.

To add new mappings:

1. Open `exercises.csv` to find the exercise name and ID
2. Add the mapping to `EXERCISE_NAME_TO_GIF_ID` in `utils/exerciseGifMapper.ts`

Example:
```typescript
export const EXERCISE_NAME_TO_GIF_ID: Record<string, string> = {
  'Barbell Bench Press': '0033',  // maps to 0033.gif
  'Barbell Row': '0049',          // maps to 0049.gif
  // ... add more mappings
};
```

## Database Integration

Exercise GIFs can be referenced in the `exercises` table via the `gif_url` column:

```sql
-- Update an exercise with local GIF path
UPDATE exercises
SET gif_url = '/assets/exercises/0033.gif'
WHERE name = 'Barbell Bench Press';

-- Or use remote URL if needed
UPDATE exercises
SET gif_url = 'https://example.com/exercises/0033.gif'
WHERE name = 'Barbell Bench Press';
```

## Performance Considerations

- **File Size**: GIFs range from ~200KB to ~500KB each
- **Total Size**: ~365MB for all 1,323 GIFs
- **Recommendation**:
  - For web: Consider lazy loading or using a CDN
  - For mobile: Bundle only commonly used exercises, fetch others on-demand
  - Consider converting to WebP or MP4 for better compression

## Attribution

All exercise animations are from the original Kaggle dataset. The exercises-gifs repository serves as a backup host for these animations. All rights belong to the original creators and dataset owner.

## Next Steps

1. **Expand Mappings**: Map more MetriqFit exercises to GIFs
2. **CDN Upload**: Consider uploading GIFs to a CDN for better performance
3. **Format Optimization**: Convert GIFs to WebP or MP4 for smaller file sizes
4. **Lazy Loading**: Implement lazy loading for exercise animations
5. **Fallback Handling**: Add placeholder images for unmapped exercises
