import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { AppIconButton, PageContainer, spacingTokens } from '../../../shared/ui';

export default function EditDictionaryPage() {
  const { locale, dictId } = useParams<{ locale: string; dictId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <PageContainer size="default">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: spacingTokens.section_header_gap }}>
        <AppIconButton onClick={() => navigate(`/${locale}/dictionary/${dictId}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </AppIconButton>
        <Typography variant="h1">{t('dictionary.editSettings')}</Typography>
      </Box>
      <Typography variant="body1">
        {t('dictionary.editingSettingsFor', { dictId: dictId ?? '' })}
      </Typography>
      {/* Settings form will go here */}
    </PageContainer>
  );
}
