import { Ionicons } from '@expo/vector-icons';
import { type IconProps } from '@expo/vector-icons/build/createIconSet';
import { type ComponentProps } from 'react';
import { useTokens } from '../../lib/theme';

export function TabBarIcon({ style, ...rest }: IconProps<ComponentProps<typeof Ionicons>['name']>) {
    const { c } = useTokens();
    return <Ionicons size={24} style={[{ marginBottom: -3 }, style]} color={c.text} {...rest} />;
}
