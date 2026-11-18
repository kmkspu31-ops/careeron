import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/config";

export async function GET(): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "프로필을 불러오지 못했습니다." }, { status: 503 });
  return NextResponse.json({
    id: authData.user.id,
    email: authData.user.email ?? "",
    fullName: data?.full_name ?? "",
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽을 수 없습니다." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("fullName" in body) || typeof body.fullName !== "string" || body.fullName.trim().length > 80) {
    return NextResponse.json({ error: "이름은 80자 이내로 입력해 주세요." }, { status: 400 });
  }

  const { data, error } = await supabase.from("profiles")
    .update({ full_name: body.fullName.trim(), updated_at: new Date().toISOString() })
    .eq("id", authData.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "프로필을 저장하지 못했습니다." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const url = getSupabaseUrl();
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabase || !url || !adminKey) {
    return NextResponse.json({ error: "계정 탈퇴를 위한 서버 설정이 필요합니다." }, { status: 503 });
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let response: Response;
  try {
    response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/admin/users/${encodeURIComponent(authData.user.id)}`, {
      method: "DELETE",
      headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "계정 삭제 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  if (!response.ok) return NextResponse.json({ error: "계정을 삭제하지 못했습니다. 관리자에게 문의해 주세요." }, { status: 502 });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
