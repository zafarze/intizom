from modeltranslation.translator import register, TranslationOptions
from .models import Quarter, Rule, Subject

@register(Quarter)
class QuarterTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(Rule)
class RuleTranslationOptions(TranslationOptions):
    fields = ('title',)

@register(Subject)
class SubjectTranslationOptions(TranslationOptions):
    fields = ('name',)
